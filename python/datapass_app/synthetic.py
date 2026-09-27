"""Two independent, explicitly synthetic clients; no FOIL science in this module."""
from .server import Registry, Evaluation

RIG = {'span': (1,14), 'stroke':(.1,4), 'arm':(2.1,7), 'height':(3,10), 'chord':(.3,2),
       'frequency':(.1,2), 'pitch':(0,60), 'phaseOffset':(0,180)}
BENCH = {'length':(3,12), 'width':(1,4), 'height':(.5,3), 'lift':(0,3), 'frequency':(.1,1)}
def _validate(p, fields):
    if set(p) != set(fields): raise ValueError('Unexpected parameters')
    for key, (lo, hi) in fields.items():
        if not lo <= p[key] <= hi: raise ValueError('Parameter outside domain')

def metric(i,label,value,unit,note='Illustrative geometry; not an engineering validation'):
    return dict(id=i,label=label,value=value,unit=unit,note=note)

def rig(req: Evaluation):
    if req.scenarioId not in ('standard','compact'): raise ValueError('Unknown scenario')
    p=req.parameters;_validate(p,RIG)
    if p['arm'] <= p['stroke']/2: raise ValueError('Infeasible rocker geometry')
    return {'metrics':[metric('span','Envergure',p['span'],'m'),metric('stroke','Course verticale',p['stroke'],'m'),
        metric('period','Periode',1/p['frequency'],'s'),metric('parts','Pieces liees',11,'')],
        'warnings':['Synthetic parameters; prescribed kinematics only. No force, energy or economic model.']}

def bench(req: Evaluation):
    if req.scenarioId != 'standard': raise ValueError('Unknown scenario')
    p=req.parameters;_validate(p,BENCH)
    return {'metrics':[metric('length','Longueur',p['length'],'m'),metric('width','Largeur',p['width'],'m'),
        metric('period','Periode',1/p['frequency'],'s'),metric('parts','Pieces liees',9,'')],
        'warnings':['Synthetic bench geometry. No validated machine trajectory.']}

def public_registry():
    return Registry().register('motion-rig',rig).register('transfer-bench',bench)
