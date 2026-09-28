import json
import pytest
from datapass_app.authoring import StudioApp, NumberParameter, ViewSpec, TaskSpec, ArtifactBinding

def test_python_authoring_emits_inert_manifest():
    app=(StudioApp('demo-app','Demo App')
         .parameter(NumberParameter('gain','Gain',1.0,0.0,3.0,0.1,'x'))
         .view(ViewSpec('lab','Laboratory','lab'))
         .task(TaskSpec('evaluate','Evaluate',('parameter.gain',),('metrics',)))
         .artifact(ArtifactBinding('figure-a','Figure A','figure',('entity-a',),source_kind='synthetic')))
    value=json.loads(app.dumps())
    assert value['format']=='datapass.studio.app'
    assert value['parameters'][0]['default']==1.0
    assert 'callback' not in app.dumps().lower()

def test_python_authoring_rejects_duplicate_and_bad_bounds():
    app=StudioApp('demo-app','Demo').view(ViewSpec('lab','Lab','lab'))
    p=NumberParameter('gain','Gain',1,0,2,.1)
    app.parameter(p)
    with pytest.raises(ValueError): app.parameter(p)
    with pytest.raises(ValueError): NumberParameter('bad','Bad',5,0,2,.1)
    with pytest.raises(ValueError): NumberParameter('nan','NaN',float('nan'),0,2,.1)
    with pytest.raises(ValueError): ArtifactBinding('bad-source','Bad source','figure',('entity-a',),source_kind='author')

def test_python_authoring_rejects_unknown_task_parameter():
    app=(StudioApp('demo-app','Demo').view(ViewSpec('lab','Lab','lab')).task(TaskSpec('evaluate','Evaluate',('parameter.missing',),('metrics',))))
    with pytest.raises(ValueError): app.manifest()