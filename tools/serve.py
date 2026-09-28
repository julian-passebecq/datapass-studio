"""Serve a built public or explicitly opted-in private client on loopback only."""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'python'))

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory',default='dist')
    parser.add_argument('--port',type=int,default=8765)
    parser.add_argument('--api',action='store_true',help='Compatibility flag: the explicit bridge is always enabled')
    parser.add_argument('--private-foil',action='store_true',help='Load the installed private FOIL adapter')
    args=parser.parse_args()
    directory=(ROOT/args.directory).resolve()
    build=json.loads((directory/'BUILD.json').read_text())
    if build.get('private') and not args.private_foil:
        raise SystemExit('This build includes private data. Start explicitly with --private-foil.')
    if not 1024<=args.port<=65535: raise SystemExit('Choose a non-privileged port')
    from datapass_app.synthetic import public_registry
    from datapass_app.server import create_app
    registry=public_registry()
    if args.private_foil:
        from datapass_app.foil import install_handler
        install_handler(registry,ROOT/'.private/foil/source')
    import uvicorn
    print('Studio: http://127.0.0.1:'+str(args.port)+' / '+('PRIVATE LOCAL CLIENT' if args.private_foil else 'synthetic public clients'))
    uvicorn.run(create_app(registry,directory),host='127.0.0.1',port=args.port,log_level='warning')

if __name__=='__main__': main()
