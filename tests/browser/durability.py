"""Production-origin persistence checks. Never substituted by an in-memory mock."""
from playwright.sync_api import expect

_WAIT_FOR_VALUE = """async ([clientId, field, value]) => {
  const db = await new Promise((resolve,reject) => {
    const r=indexedDB.open('datapass-studio-v1');
    r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
  });
  try {
    const row=await new Promise((resolve,reject)=>{
      const r=db.transaction('workspaces').objectStore('workspaces').get(clientId);
      r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
    });
    return row?.document?.parameters?.[field]===value;
  } finally { db.close(); }
}"""


def run_durability(page, context, url, check, client, field, initial, piece):
    """Run on one real HTTP origin and its real IndexedDB database."""
    def number(target):
        return target.locator(f'[data-field="{field}"] input[type=number]')

    def wait_saved(target, value):
        target.wait_for_function(_WAIT_FOR_VALUE, arg=[client, field, value], timeout=10000)
        expect(target.locator('.saved')).to_contain_text('Enregistr', timeout=10000)

    def reload_restores():
        page.set_viewport_size({'width':1440,'height':1050})
        page.locator('.mode-tabs').get_by_role('button',name='Laboratoire 3D',exact=True).click()
        number(page).fill(str(initial+.5)); number(page).press('Enter')
        page.locator(f'[data-select-part="{piece}"]').click()
        page.locator('.mode-tabs').get_by_role('button',name='Plans 2D',exact=True).click()
        wait_saved(page, initial+.5)
        # The saved row must contain this view/selection, not a preceding debounced write.
        page.wait_for_function("""async id => {
          const db=await new Promise(resolve=>{const r=indexedDB.open('datapass-studio-v1');r.onsuccess=()=>resolve(r.result)});
          try { return await new Promise(resolve=>{const r=db.transaction('workspaces').objectStore('workspaces').get(id);
            r.onsuccess=()=>resolve(r.result?.document?.view?.mode==='plans');}); } finally { db.close(); }
        }""", arg=client)
        page.reload(wait_until='load')
        expect(page.locator('[data-testid="plan-side"]')).to_be_visible()
        expect(page.locator('.selection-bar code')).to_have_text(piece)
        page.locator('.mode-tabs').get_by_role('button',name='Laboratoire 3D',exact=True).click()
        expect(number(page)).to_have_value(str(initial+.5))
        wait_saved(page, initial+.5)

    def conflicting_tab():
        second=context.new_page()
        try:
            second.goto(url.rstrip('/')+'/?client='+client, wait_until='load')
            expect(number(second)).to_have_value(str(initial+.5))
            number(page).fill(str(initial+1)); number(page).press('Enter')
            wait_saved(page, initial+1)
            number(second).fill(str(initial+1.5)); number(second).press('Enter')
            expect(second.locator('.error-banner')).to_contain_text('Conflit',timeout=10000)
            expect(number(second)).to_have_value(str(initial+1.5))
            # A stale writer preserves its own draft but cannot replace the stored winner.
            page.reload(wait_until='load')
            expect(number(page)).to_have_value(str(initial+1))
            wait_saved(page, initial+1)
        finally:
            second.close(run_before_unload=False)

    check('HTTP reload restores real IndexedDB values, view and selection',reload_restores)
    check('two HTTP tabs refuse stale writes while preserving both drafts',conflicting_tab)


if __name__ == '__main__':
    import argparse
    import json
    from pathlib import Path
    from playwright.sync_api import sync_playwright
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',default='http://127.0.0.1:8765')
    parser.add_argument('--executable')
    args=parser.parse_args()
    report={'mode':'production-http-real-indexeddb','tests':[]}
    def check(name,fn):
        try:
            fn(); report['tests'].append({'name':name,'status':'passed'})
        except Exception as error:
            report['tests'].append({'name':name,'status':'failed','error':str(error)[:2000]})
    with sync_playwright() as p:
        options={'headless':True,'args':['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']}
        if args.executable: options['executable_path']=args.executable
        browser=p.chromium.launch(**options)
        ctx=browser.new_context(viewport={'width':1440,'height':1050})
        page=ctx.new_page(); page.set_default_timeout(10000)
        page.goto(args.url+'/?client=motion-rig',wait_until='load')
        page.locator('h1').wait_for()
        run_durability(page,ctx,args.url,check,'motion-rig','span',6,'panel-a')
        ctx.close(); browser.close()
    report['passed']=sum(t['status']=='passed' for t in report['tests'])
    report['failed']=len(report['tests'])-report['passed']
    root=Path(__file__).resolve().parents[2]
    (root/'qa').mkdir(exist_ok=True)
    (root/'qa/durability-report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
    raise SystemExit(1 if report['failed'] else 0)
