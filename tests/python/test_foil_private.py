"""Opt-in installed private reference checks. No private fixture data is committed."""
from pathlib import Path
import json
import subprocess
import pytest
from fastapi.testclient import TestClient
from datapass_app.server import create_app
from datapass_app.synthetic import public_registry
from datapass_app.foil import load_source, install_handler

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'.private/foil/source'
pytestmark=pytest.mark.skipif(not SOURCE.exists(),reason='Private authorized reference not installed')
@pytest.fixture(scope='module')
def original(): return load_source(SOURCE)
@pytest.fixture(scope='module')
def client(): return TestClient(create_app(install_handler(public_registry(),SOURCE)))

@pytest.mark.parametrize('family',list('PAB'))
@pytest.mark.parametrize('case',list('DNF'))
def test_all_reference_results_match_original_kernel(client,original,family,case):
    ref,cand=original;id=f'FOIL-WIND-{family}-{case}-R0';base=ref.load_case(id);kernel=ref.get_kernel()
    parameters={f['path']:cand.get_path(base,f['path']) for f in cand.FIELDS}
    d=dict(version=1,requestId='parity',clientId='foil-wind',scenarioId=id,inputRevision=0,parameters=parameters)
    response=client.post('/api/v1/evaluate',json=d,headers={'X-Studio-Request':'1'})
    assert response.status_code==200
    assert response.json()['result']==kernel.lcoe(base)
    assert response.json()['baseHash']==kernel.digest(base)

def test_candidate_recalculates_without_mutating_reference(client,original):
    ref,cand=original;base=ref.load_case('FOIL-WIND-A-N-R0');kernel=ref.get_kernel();before=kernel.digest(base)
    parameters={f['path']:cand.get_path(base,f['path']) for f in cand.FIELDS};parameters['geometry.span_m']+=1
    d=dict(version=1,requestId='change',clientId='foil-wind',scenarioId=base['case_id'],inputRevision=1,parameters=parameters)
    response=client.post('/api/v1/evaluate',json=d,headers={'X-Studio-Request':'1'})
    assert response.status_code==200 and response.json()['modelHash']!=before
    assert kernel.digest(ref.load_case(base['case_id']))==before
    assert response.json()['provenance']['scientificallyValidated'] is False

def test_browser_prescribed_pose_matches_python_across_all_cases(original):
    ref,_=original;kernel=ref.get_kernel()
    js="""import {data} from './public/private-client/data.js';import {presentationPose} from './public/private-client/client.js';console.log(JSON.stringify(data.order.flatMap(id=>Array.from({length:17},(_,i)=>({id,phase:i/16,pose:presentationPose(data.cases[id],i/16)})))));"""
    records=json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=ROOT,text=True))
    assert len(records)==153
    for row in records:
        c=ref.load_case(row['id']);expected=kernel.kinematics(c,row['phase']/c['kinematics']['frequency_hz'])
        for id in ('A','B'):
            for key,value in expected[id].items(): assert row['pose'][id][key]==pytest.approx(value,rel=1e-10,abs=1e-10)
