"""Install the user's pinned, authorized FOIL v0.3 ZIP into a gitignored local client.

No private client material is fetched from the internet or published. Source
installation refuses an existing target and validates ZIP paths/duplicates/sizes.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import stat
import sys
import zipfile

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'python'))

def install(archive: Path):
    pin=json.loads((ROOT/'integrations/foil-source.lock.json').read_text())
    if hashlib.sha256(archive.read_bytes()).hexdigest()!=pin['packageSha256']:
        raise ValueError('This ZIP differs from the reviewed v0.3 package. Review and deliberately update the pin first.')
    target=ROOT/'.private/foil/source';public=ROOT/'public/private-client'
    if target.exists() or public.exists(): raise ValueError('An installation already exists. Keep/backup it; do not overwrite silently.')
    target.mkdir(parents=True)
    try:
        with zipfile.ZipFile(archive) as z:
            seen=set();total=0
            for e in z.infolist():
                path=PurePosixPath(e.filename)
                if path.is_absolute() or '..' in path.parts or '\\' in e.filename or e.filename in seen:
                    raise ValueError('Unsafe or duplicate ZIP member')
                seen.add(e.filename);total+=e.file_size
                if stat.S_ISLNK(e.external_attr>>16) or total>100_000_000 or e.file_size>25_000_000:
                    raise ValueError('Archive size/type exceeds installation limits')
                if e.is_dir(): continue
                if not (e.filename.startswith(('reference/r0/','windlab/')) or e.filename in {'web/src/geometry.js','web/src/kernel.js'}): continue
                out=target.joinpath(*path.parts);out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(z.read(e))
        from datapass_app.foil import load_source,result_metrics
        reference,candidate=load_source(target);kernel=reference.get_kernel()
        order=['FOIL-WIND-A-N-R0']+[i for i in reference.case_ids() if i!='FOIL-WIND-A-N-R0']
        cases={id:reference.load_case(id) for id in order}
        fields=[{**f,'id':f['path']} for f in candidate.FIELDS]
        metrics={id:result_metrics(kernel.lcoe(c)) for id,c in cases.items()}
        meshes=json.loads(reference.verified_asset('cad/viewer_meshes.json').read_text())
        data={'defaultId':order[0],'order':order,'cases':cases,'parameters':fields,'meshes':meshes,'metrics':metrics}
        public.mkdir(parents=True)
        shutil.copyfile(target/'web/src/geometry.js',public/'geometry.js')
        shutil.copyfile(target/'web/src/kernel.js',public/'kernel.js')
        shutil.copyfile(ROOT/'integrations/foil-client.template.js',public/'client.js')
        (public/'data.js').write_text('export const data = '+json.dumps(data,separators=(',',':'),ensure_ascii=True)+';\n')
        receipt={'classification':'private','packageSha256':pin['packageSha256'],'manifestSha256':pin['manifestSha256'],
                 'kernelSha256':pin['kernelSha256'],'cases':len(cases),'publishAllowed':False,
                 'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in public.iterdir() if p.is_file()}}
        (ROOT/'.private/foil/receipt.json').write_text(json.dumps(receipt,indent=2))
        print('Installed 9 verified private reference cases. No source file was changed.')
        print('Build: node tools/build.mjs --portable --private  (or omit --portable with npm dependencies installed)')
        print('Serve: python tools/serve.py --private-foil --directory dist')
        return receipt
    except Exception:
        shutil.rmtree(target,ignore_errors=True);shutil.rmtree(public,ignore_errors=True);raise

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('archive',type=Path)
    args=parser.parse_args();install(args.archive)
