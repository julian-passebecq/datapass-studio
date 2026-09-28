"""Optional trusted private client adapter. Contains no FOIL reference data or solver.

The user must install their authorized package explicitly. Original reference
hashes and wrapper hashes are verified before Python imports execute.
"""
from __future__ import annotations
import hashlib
import importlib
import json
import sys
from pathlib import Path
from copy import deepcopy
from .server import Evaluation, Registry

ROOT = Path(__file__).resolve().parents[2]

def verify_source(source: Path):
    source=source.resolve()
    pin=json.loads((ROOT/'integrations/foil-source.lock.json').read_text())
    for rel, expected in pin['files'].items():
        p=(source/rel).resolve()
        if not p.is_relative_to(source) or hashlib.sha256(p.read_bytes()).hexdigest()!=expected:
            raise ValueError('Private wrapper does not match the reviewed package')
    r0=source/'reference/r0'
    raw=(r0/'manifest.lock.json').read_bytes()
    if hashlib.sha256(raw).hexdigest()!=pin['manifestSha256']:
        raise ValueError('Private reference manifest mismatch')
    manifest=json.loads(raw)
    for entry in manifest['files']:
        p=(r0/entry['path']).resolve()
        if not p.is_relative_to(r0.resolve()): raise ValueError('Reference path escape')
        data=p.read_bytes()
        if len(data)!=entry['bytes'] or hashlib.sha256(data).hexdigest()!=entry['sha256']:
            raise ValueError('Private reference artifact mismatch')
    return pin

def load_source(source: Path):
    source=source.resolve();verify_source(source)
    previous=sys.modules.get('windlab')
    if previous and Path(previous.__file__).resolve().parent!=source/'windlab':
        raise ValueError('Another private package is already loaded in this process')
    sys.path.insert(0,str(source))
    try:
        reference=importlib.import_module('windlab.reference')
        candidate=importlib.import_module('windlab.candidate')
    finally:
        sys.path.pop(0)
    return reference,candidate

def result_metrics(result):
    def metric(i,label,value,unit,note): return dict(id=i,label=label,value=value,unit=unit,note=note)
    return [metric('power','Puissance a 12 m/s',result['p_at_12_m_s_kw'],'kW','Hypothese de screening L0'),
            metric('aep','AEP annee 1',result['aep_year1_kwh']/1000,'MWh','Ressource synthetique, pas mesuree'),
            metric('lcoe','LCOE conditionnel',result['lcoe_eur2026_mwh'],'EUR/MWh','Non valide pour le vent'),
            metric('area','Surface de reference',result['area_reference_m2'],'m2','Envergure x course')]

def install_handler(registry: Registry, source: Path):
    reference,candidate=load_source(source)
    kernel=reference.get_kernel()
    schema=json.loads(reference.verified_asset('contracts/experiment.schema.json').read_text())
    field_ids={f['path'] for f in candidate.FIELDS}
    def evaluate(req: Evaluation):
        if set(req.parameters)!=field_ids: raise ValueError('Private fields are incomplete or unknown')
        base=reference.load_case(req.scenarioId)
        patch=candidate.patch_from_values(base,req.parameters)
        current=candidate.build_candidate(base,patch,'STUDIO-r'+str(req.inputRevision)) if patch else deepcopy(base)
        errors=candidate.validate_body(current,schema,kernel)
        if errors: raise ValueError('Rejected private candidate')
        result=kernel.lcoe(current)
        return {'metrics':result_metrics(result),'modelHash':kernel.digest(current),
                'baseHash':kernel.digest(base),'sourceRevision':base['revision'],
                'modelStatus':result['status'],'result':result,
                'warnings':['Prescribed L0 screening, not experimentally validated wind LCOE.',
                            'Geometry preview is not regenerated BRep/STEP or a fabrication approval.',
                            'No cloud update or source-truth modification was made.']}
    registry.register('foil-wind',evaluate,classification='private')
    return registry
