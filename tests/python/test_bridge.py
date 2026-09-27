import json
import math
import pytest
from fastapi.testclient import TestClient
from datapass_app.server import create_app, Registry
from datapass_app.synthetic import public_registry

PARAMS=dict(span=6,stroke=2.6,arm=3.2,height=4.8,chord=.75,frequency=.4,pitch=24,phaseOffset=90)
def request(**patch):
    return dict(version=1,requestId='test-1',clientId='motion-rig',scenarioId='standard',inputRevision=4,parameters=PARAMS.copy(),**patch)
@pytest.fixture
def client(): return TestClient(create_app(public_registry()))
def post(c,data,**kwargs): return c.post('/api/v1/evaluate',json=data,headers={'X-Studio-Request':'1',**kwargs})
def test_health_lists_only_explicit_clients(client):
    assert client.get('/api/health').json()['clients']==['motion-rig','transfer-bench']
def test_reference_evaluation_correlated_and_synthetic(client):
    r=post(client,request());assert r.status_code==200
    d=r.json();assert d['inputRevision']==4 and d['requestId']=='test-1'
    assert d['metrics'][2]['value']==2.5
    assert d['provenance']['scientificallyValidated'] is False
    assert len(d['parameterHash'])==64
@pytest.mark.parametrize('patch',[{'span':True},{'span':100},{'span':'8'},{'extra':1},{'__proto__':3}])
def test_parameter_rejections(client,patch):
    d=request();d['parameters'].update(patch);assert post(client,d).status_code==422
def test_incomplete_parameters(client):
    d=request();del d['parameters']['span'];assert post(client,d).status_code==422
@pytest.mark.parametrize('field,value',[('version',2),('clientId','../foil'),('clientId','foil-wind'),('scenarioId','missing'),('inputRevision',-1),('inputRevision',True),('requestId','<script>')])
def test_invalid_envelope(client,field,value):
    d=request();d[field]=value;assert post(client,d).status_code==422
def test_duplicate_json_fields_refused(client):
    r=client.post('/api/v1/evaluate',content='{"version":1,"version":1}',headers={'X-Studio-Request':'1','Content-Type':'application/json'})
    assert r.status_code==422
def test_nonfinite_json_refused(client):
    d=request();d['parameters']['span']=math.nan
    r=client.post('/api/v1/evaluate',content=json.dumps(d),headers={'X-Studio-Request':'1','Content-Type':'application/json'})
    assert r.status_code==422
def test_response_does_not_reflect_untrusted_values(client):
    d=request();d['injected']='PRIVATE_SECRET_MARKER'
    r=post(client,d);assert r.status_code==422;assert 'PRIVATE_SECRET' not in r.text
def test_write_requires_explicit_header(client): assert client.post('/api/v1/evaluate',json=request()).status_code==403
def test_wrong_content_type(client): assert client.post('/api/v1/evaluate',content='{}',headers={'X-Studio-Request':'1'}).status_code==415
def test_cross_origin_write_refused(client): assert post(client,request(),Origin='https://hostile.example').status_code==403
def test_same_origin_allowed(client): assert post(client,request(),Origin='http://testserver').status_code==200
def test_host_rebinding_refused(client): assert client.get('/api/health',headers={'Host':'hostile.example'}).status_code==403
def test_large_input_refused(client): assert client.post('/api/v1/evaluate',content='x'*70000,headers={'X-Studio-Request':'1','Content-Type':'application/json'}).status_code==413
def test_registry_duplicate_and_arbitrary_callable_guard():
    r=Registry().register('abc',lambda req: {})
    with pytest.raises(ValueError): r.register('abc',lambda req: {})
    with pytest.raises(ValueError): r.register('new',None)
def test_second_domain_uses_same_protocol(client):
    d=request();d.update(clientId='transfer-bench',parameters=dict(length=7,width=1.8,height=1.4,lift=1.3,frequency=.25))
    r=post(client,d);assert r.status_code==200 and r.json()['metrics'][2]['value']==4
