"""Exercise the real loopback HTTP service, independently of browser automation."""
from __future__ import annotations
import argparse
import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from urllib.parse import urlsplit


def smoke(url: str):
    parsed=urlsplit(url)
    if parsed.scheme!='http' or parsed.hostname not in {'127.0.0.1','localhost','::1'} or parsed.path not in {'','/'}:
        raise ValueError('Use a loopback Studio origin without a path')
    url=url.rstrip('/')
    results=[]
    def request(path, data=None, headers=None):
        body=json.dumps(data).encode() if data is not None else None
        req=Request(url+path,data=body,headers=headers or {})
        try:
            with urlopen(req,timeout=10) as res: return res.status,res.read(),dict(res.headers)
        except HTTPError as e: return e.code,e.read(),dict(e.headers)
    status,raw,_=request('/api/health');health=json.loads(raw)
    assert status==200 and health['mode']=='local-trusted-clients-only'
    results.append('Live health endpoint and explicit registered clients')
    status,raw,headers=request('/')
    assert status==200 and b'id="root"' in raw and 'nosniff' in headers.get('x-content-type-options',headers.get('X-Content-Type-Options',''))
    results.append('Production app is served with security headers')
    payload={'version':1,'requestId':'http-smoke','clientId':'transfer-bench','scenarioId':'standard','inputRevision':7,
             'parameters':{'length':6,'width':2,'height':1,'lift':1,'frequency':.25}}
    safe={'Content-Type':'application/json','X-Studio-Request':'1','Origin':url}
    status,raw,_=request('/api/v1/evaluate',payload,safe);output=json.loads(raw)
    assert status==200 and output['inputRevision']==7 and output['requestId']=='http-smoke'
    assert output['provenance']['scientificallyValidated'] is False and len(output['parameterHash'])==64
    assert next(m['value'] for m in output['metrics'] if m['id']=='period')==4
    results.append('Actual registered Python computation, revision correlation and provenance')
    assert request('/api/v1/evaluate',payload,{'Content-Type':'application/json'})[0]==403
    results.append('Browser-write header is enforced over HTTP')
    assert request('/api/v1/evaluate',payload,{**safe,'Origin':'https://unrelated.invalid'})[0]==403
    results.append('Cross-origin writes are refused over HTTP')
    report={'mode':'live-loopback-http-no-browser','passed':len(results),'checks':results,'registeredClients':health['clients']}
    print(json.dumps(report,indent=2));return report

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',default='http://127.0.0.1:8765')
    smoke(p.parse_args().url)
