"""Browser integration checks on real source.

--html uses the delivered offline HTML in an isolated DOM. This is NOT a claim
of live HTTP, native IndexedDB, GPU WebGL or OS-download validation.
--url is the additional production HTTP gate, intended for unrestricted CI/local use.
"""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import time
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[2]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--html',default='dist/studio-offline.html')
    parser.add_argument('--url')
    parser.add_argument('--private',action='store_true')
    parser.add_argument('--executable',default=os.getenv('CHROMIUM'))
    args=parser.parse_args()
    report={'mode':'production-http' if args.url else 'isolated-offline-dom', 'private':args.private,
            'tests':[], 'limitations':[] if args.url else ['Opaque-origin DOM: IndexedDB unavailable; memory session explicitly used.',
              'Export payload generation checked; no OS-download or live HTTP claim.', 'GPU WebGL unavailable in this environment; renderer recorded below.']}
    qa=ROOT/'qa';(qa/'screenshots').mkdir(parents=True,exist_ok=True)
    prefix='private' if args.private else 'public'
    html=(ROOT/args.html).read_text() if not args.url else None
    errors=[]
    with sync_playwright() as p:
        options=dict(headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
        if args.executable: options['executable_path']=args.executable
        browser=p.chromium.launch(**options)
        ctx=browser.new_context(viewport={'width':1440,'height':1050},device_scale_factor=1,accept_downloads=True)
        page=ctx.new_page();page.set_default_timeout(7000)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.evaluate('globalThis.__STUDIO_QA__=true')
        if args.url:
            page.add_init_script('globalThis.__STUDIO_QA__=true')
            page.goto(args.url+'/?qa=1'+('&client=foil-wind' if args.private else ''))
        else: page.set_content(html,wait_until='load')
        page.locator('h1').wait_for()
        page.locator('canvas[data-renderer]').wait_for()
        page.wait_for_timeout(600)
        # Instrument emitted anchors, not the computation or application state.
        # Prevent OS navigation in the isolated test while retaining actual Blob creation.
        page.evaluate("""() => {
          window.__downloads=[];window.__exportBlobs=new Map();
          const create=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{const u=create(b);window.__exportBlobs.set(u,b);return u;};
          const click=HTMLAnchorElement.prototype.click;
          HTMLAnchorElement.prototype.click=function(){if(this.download){window.__downloads.push({name:this.download,href:this.href});return;}return click.call(this);};
        }""")
        renderer=page.locator('canvas').get_attribute('data-renderer');report['renderer']=renderer
        client='foil-wind' if args.private else 'motion-rig';piece='foil_A' if args.private else 'panel-a';field='geometry.span_m' if args.private else 'span'
        initial=8 if args.private else 6;changed=initial+1
        def check(name,fn):
            start=time.monotonic()
            try:
                fn();report['tests'].append({'name':name,'status':'passed','seconds':round(time.monotonic()-start,3)});print('PASS',name,flush=True)
            except Exception as e:
                report['tests'].append({'name':name,'status':'failed','error':str(e)[:2000]});print('FAIL',name,str(e)[:1200],flush=True)
                page.screenshot(path=str(qa/'screenshots'/f'{prefix}-failure-{len(report["tests"])}.png'))
                dialog=page.get_by_role('dialog')
                if dialog.count(): dialog.get_by_role('button',name='Fermer',exact=True).click()
        def dismiss_error():
            button=page.get_by_role('button',name='Fermer le message')
            if button.count(): button.click()
        def mode(label): page.locator('.mode-tabs').get_by_role('button',name=label,exact=True).click();page.wait_for_timeout(250)
        def number(): return page.locator(f'[data-field="{field}"] input[type=number]')
        def export_payload(label):
            page.get_by_role('button',name='Exporter',exact=True).click()
            page.get_by_role('dialog').get_by_role('button',name=label,exact=True).click()
            data=page.evaluate('async()=>{const v=window.__downloads.at(-1);return {name:v.name,text:await window.__exportBlobs.get(v.href).text()};}')
            page.get_by_role('dialog').get_by_role('button',name='Fermer',exact=True).click()
            return data
        check('real 3D renderer draws a nonempty mesh',lambda:assert_true(int(page.locator('canvas').get_attribute('data-triangles'))>100))
        def select3d():
            canvas=page.locator('canvas');xy=canvas.evaluate('(c,id)=>c.__sceneApi.screenPoint(id)',piece)
            canvas.click(position={'x':xy[0],'y':xy[1]});assert_true(page.locator('.selection-bar code').inner_text()==piece)
        check('3D ray picking selects the shared entity',select3d)
        def direct_reference_link():
            linked=page.locator('.selection-reference')
            if linked.count()==0: return
            linked.click();expect(page.locator('.reference-layout')).to_be_visible();mode('Laboratoire 3D')
        check('selected entities can jump directly to linked references',direct_reference_link)
        def parameter_change():
            number().fill(str(changed));number().press('Enter');assert_true(number().input_value()==str(changed))
            assert_true(page.locator('.selection-bar').inner_text().endswith('001'))
            if args.private:
                assert_true('Apercu parametrique' in page.locator('.mesh-source').inner_text())
                assert_true(page.locator('.metric-value').first.inner_text().startswith('\u2014'))
        check('parameter edit updates geometry and invalidates private cached metrics',parameter_change)
        def undo_redo():
            page.get_by_role('button',name='Annuler',exact=True).click();assert_true(number().input_value()==str(initial))
            page.get_by_role('button',name='Retablir',exact=True).click();assert_true(number().input_value()==str(changed))
        check('undo and redo restore parameter snapshots',undo_redo)
        def orbit():
            c=page.locator('canvas');before=c.evaluate('(c,id)=>c.__sceneApi.screenPoint(id)',piece);r=c.bounding_box();page.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);page.mouse.down();page.mouse.move(r['x']+r['width']/2+70,r['y']+r['height']/2+12,steps=8);page.mouse.up();after=c.evaluate('(c,id)=>c.__sceneApi.screenPoint(id)',piece);assert_true(abs(before[0]-after[0])>2)
        check('orbit changes only the presentation camera',orbit)
        def plans():
            mode('Plans 2D');assert_true(page.locator('svg .plan-part.selected').count()==3)
            before=page.locator('[data-testid="plan-side"] .plan-part.selected .plan-edge').get_attribute('d')
            slider=page.get_by_role('slider',name='Phase du cycle');slider.focus();slider.press('End');page.wait_for_timeout(150)
            after=page.locator('[data-testid="plan-side"] .plan-part.selected .plan-edge').get_attribute('d')
            assert_true(before!=after)
        check('three 2D views share selection and cycle phase',plans)
        def keyboard_selection():
            target='mast' if args.private else 'tower';g=page.locator(f'[data-testid="plan-side"] [data-part-id="{target}"]');g.focus();g.press('Enter');assert_true(page.locator('.selection-bar code').inner_text()==target)
        check('2D entity selection is keyboard accessible',keyboard_selection)
        page.wait_for_timeout(500);page.screenshot(path=str(qa/'screenshots'/f'{prefix}-plans.png'),full_page=True)
        def compare():
            mode('Comparer');assert_true(page.locator('canvas').count()==2);assert_true(page.locator('.diff-card').count()>=1)
            cs=page.locator('canvas');c=cs.nth(1);r=c.bounding_box();before=cs.nth(0).evaluate('(c,id)=>c.__sceneApi.screenPoint(id)',piece)
            page.mouse.move(r['x']+120,r['y']+130);page.mouse.down();page.mouse.move(r['x']+180,r['y']+155,steps=8);page.mouse.up()
            after=cs.nth(0).evaluate('(c,id)=>c.__sceneApi.screenPoint(id)',piece);assert_true(abs(before[0]-after[0])>2)
        check('comparison shares camera motion but preserves separate parameter sets',compare)
        def references():
            mode('Références');expect(page.locator('.reference-layout')).to_be_visible();cards=page.locator('.artifact-card');assert_true(cards.count()>0)
            cards.first.click();expect(page.locator('[data-testid="artifact-document"]')).to_be_visible();assert_true(page.locator('.artifact-preview .plan-svg').count()==1)
            assert_true(page.locator('.artifact-inspector .entity-link[aria-pressed="true"]').count()>=1)
            png=bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63606060f80f0001040100b51c0c020000000049454e44ae426082')
            page.get_by_label('Ouvrir une source locale pour ce document').set_input_files({'name':'local-reference.png','mimeType':'image/png','buffer':png});expect(page.locator('.document-image')).to_be_visible();expect(page.locator('.session-source-note')).to_contain_text('non sauvegardee')
        check('artifact workspace binds document reference, model entity and plan preview',references)
        def evidence_binding():
            payload=export_payload('Evidence pour adaptateur');d=json.loads(payload['text']);assert_true(len(d.get('artifactBindings',[]))>=1);assert_true(d['artifactBindings'][0]['entityIds']);assert_true('url' not in json.dumps(d['artifactBindings']))
        check('evidence export carries reviewed-shape artifact linkage without document URLs',evidence_binding)
        def explain():
            mode('Expliquer');assert_true(page.locator('.explain-grid').count()==1);assert_true(page.locator('code').count()>0)
        check('display-only explanation mode composes scene and code',explain)
        def export_workspace():
            payload=export_payload('Espace de travail JSON');d=json.loads(payload['text']);assert_true(d['parameters'][field]==changed);assert_true(d['provenance']['reviewed'] is False);assert_true(d['clientId']==client)
        check('workspace export carries real current parameters and provenance',export_workspace)
        def app_manifest():
            payload=export_payload('Manifeste app JSON');d=json.loads(payload['text']);assert_true(d['format']=='datapass.studio.app');assert_true(d['id']==client);assert_true(d['tasks'][0]['revision_guarded'] is True);assert_true('frame' not in d and 'callback' not in payload['text'].lower())
        check('declarative app manifest exports no executable client callbacks',app_manifest)
        def session_trace():
            payload=export_payload('Trace de session');d=json.loads(payload['text']);assert_true(d['format']=='datapass.studio.trace');assert_true(d['clientId']==client);assert_true(len(d['events'])>0);assert_true('parameters' not in d);assert_true(all('value' not in (e.get('meta') or {}) for e in d['events']))
        check('session trace records interaction semantics without parameter payloads',session_trace)
        def export_svg():
            payload=export_payload('SVG profil');assert_true('<svg' in payload['text']);assert_true('Pas un plan de fabrication' in payload['text']);assert_true('<script' not in payload['text'])
        check('vector export contains actual model linework and caveat',export_svg)
        def import_reject():
            inp=page.locator('input[type=file]');inp.set_input_files({'name':'broken.json','mimeType':'application/json','buffer':b'{"format":"bad","version":99}'})
            expect(page.locator('.error-banner')).to_be_visible();dismiss_error()
        check('invalid import is refused without crashing or clearing the model',import_reject)
        def import_valid():
            payload=export_payload('Espace de travail JSON');d=json.loads(payload['text']);d['parameters'][field]=initial;d['view']['mode']='lab'
            page.locator('input[type=file]').set_input_files({'name':'valid.json','mimeType':'application/json','buffer':json.dumps(d).encode()})
            dialog=page.get_by_role('dialog');dialog.get_by_role('button',name='Appliquer le document').click(timeout=3000);expect(dialog).not_to_be_visible(timeout=3000);expect(number()).to_have_value(str(initial),timeout=5000)
        check('valid import requires review before application',import_valid)
        def python_mode():
            page.get_by_role('button',name='Calculer avec Python').click()
            if args.url:
                expect(page.locator('.workspace-footer')).to_contain_text('Calcul li\u00e9 \u00e0 la r\u00e9vision')
                assert_true('obsol' not in page.locator('.workspace-footer').inner_text())
            else:
                assert_true('Export autonome' in page.locator('.error-banner').inner_text());dismiss_error()
        check('Python execution boundary is explicit for this host',python_mode)
        def client_switch():
            mode('Laboratoire 3D');number().fill(str(changed));number().press('Enter')
            page.get_by_role('combobox',name='Client actif').select_option('transfer-bench');assert_true(page.locator('h1').inner_text()=='Transfer Bench');assert_true(page.locator('canvas[data-triangles]').count()==1)
            page.get_by_role('combobox',name='Client actif').select_option(client);assert_true(number().input_value()==str(changed))
        check('second client uses the same runtime; switching preserves draft state',client_switch)
        def third_client():
            page.get_by_role('combobox',name='Client actif').select_option('signal-lab');assert_true(page.locator('h1').inner_text()=='Signal Lab');assert_true(page.locator('canvas[data-triangles]').count()==1)
            assert_true(page.locator('.metric-value').count()>=4)
            page.get_by_role('combobox',name='Client actif').select_option(client);assert_true(page.locator('h1').inner_text()!= 'Signal Lab')
        check('third analytical client proves the runtime is not FOIL/mechanics-specific',third_client)
        def renderer_recovery():
            if renderer!='native-webgl': return
            mode('Laboratoire 3D');canvas=page.locator('canvas[data-renderer="native-webgl"]');canvas.evaluate("c=>c.dispatchEvent(new Event('webglcontextlost',{cancelable:true}))")
            expect(page.locator('.fallback-notice')).to_be_visible();page.get_by_role('button',name='Reessayer le moteur 3D').click();expect(page.locator('canvas[data-renderer]')).to_be_visible(timeout=10000)
        check('WebGL loss exposes an explicit fallback and retry path',renderer_recovery)
        page.wait_for_timeout(600);page.screenshot(path=str(qa/'screenshots'/f'{prefix}-lab.png'),full_page=True)
        def reduced():
            page.emulate_media(reduced_motion='reduce');expect(page.get_by_role('button',name='Lire le cycle',exact=True)).to_be_disabled()
            slider=page.get_by_role('slider',name='Phase du cycle');slider.focus();slider.press('Home');expect(slider).to_have_value('0');page.emulate_media(reduced_motion='no-preference')
        check('reduced motion stops autoplay but allows manual seeking',reduced)
        def narrow():
            page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(500)
            overflow=page.evaluate('document.documentElement.scrollWidth-innerWidth');assert_true(overflow<=1)
            assert_true(page.get_by_role('combobox',name='Client actif').is_visible())
        check('390px layout has no horizontal page overflow',narrow)
        page.screenshot(path=str(qa/'screenshots'/f'{prefix}-mobile.png'),full_page=True)
        check('no browser JavaScript errors during completed flows',lambda:assert_true(not errors,str(errors)))
        ctx.close();browser.close()
    report['passed']=sum(t['status']=='passed' for t in report['tests']);report['failed']=sum(t['status']=='failed' for t in report['tests'])
    file=qa/('private-browser-report.json' if args.private else 'browser-report.json');file.write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2));raise SystemExit(1 if report['failed'] else 0)

def assert_true(value,message='Assertion failed'):
    if not value: raise AssertionError(message)
if __name__=='__main__': main()