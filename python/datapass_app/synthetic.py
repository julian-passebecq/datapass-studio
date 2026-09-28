"""Independent, explicitly synthetic evaluator clients; no private-domain science in this module."""
from .server import Registry, Evaluation

RIG = {'span': (1,14), 'stroke':(.1,4), 'arm':(2.1,7), 'height':(3,10), 'chord':(.3,2),
       'frequency':(.1,2), 'pitch':(0,60), 'phaseOffset':(0,180)}
BENCH = {'length':(3,12), 'width':(1,4), 'height':(.5,3), 'lift':(0,3), 'frequency':(.1,1)}
SIGNAL = {'amplitude':(.1,4), 'frequency':(.1,3), 'phaseLag':(0,180), 'damping':(0,.9), 'gain':(.2,3), 'spacing':(1,6)}
ETL = {'inputRate':(20,500), 'partitions':(1,64), 'workers':(1,16), 'shuffleMB':(50,2400), 'batchMinutes':(1,30)}

def _validate(p, fields):
    if set(p) != set(fields): raise ValueError('Unexpected parameters')
    for key, (lo, hi) in fields.items():
        if not lo <= p[key] <= hi: raise ValueError('Parameter outside domain')

def metric(i,label,value,unit,note='Illustrative synthetic result; not an engineering validation'):
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

def signal(req: Evaluation):
    if req.scenarioId not in ('standard','high-gain','phase-study'): raise ValueError('Unknown scenario')
    p=req.parameters;_validate(p,SIGNAL)
    peak=p['amplitude']*(1-p['damping'])*p['gain']
    return {'metrics':[metric('peak','Pic sortie',round(peak,3),'V','Calcul synthetique'),
        metric('rms','RMS sortie',round(peak/(2**.5),3),'V','Sinusoide ideale'),
        metric('delay','Retard',round(p['phaseLag']/360/p['frequency'],3),'s','Derive de la phase prescrite'),
        metric('channels','Canaux',3,'','Entites synchronisees')],
        'warnings':['Synthetic signal evaluator. No sensor calibration or metrology claim.']}

def etl(req: Evaluation):
    if req.scenarioId not in ('standard','high-volume'): raise ValueError('Unknown scenario')
    p=req.parameters;_validate(p,ETL)
    if p['partitions'] < p['workers']: raise ValueError('Partitions must be at least workers in this fixture')
    capacity=p['workers']*65
    latency=p['batchMinutes']+p['shuffleMB']/(max(1,p['workers'])*420)
    success=max(90,100-max(0,p['inputRate']-capacity)*.04)
    return {'metrics':[metric('capacity','Capacite synthetique',round(capacity,1),'k rows/min','workers x capacite illustrative'),
        metric('partition','Shuffle / partition',round(p['shuffleMB']/p['partitions'],1),'MB','Repartition simple'),
        metric('latency','Latence estimee',round(latency,2),'min','Fixture de demonstration'),
        metric('success','Succes estime',round(success,2),'%','Pas un SLA reel')],
        'warnings':['Synthetic ETL estimator. No Airflow, Databricks or Power BI service is called.']}

def public_registry():
    return (Registry().register('motion-rig',rig).register('transfer-bench',bench)
            .register('signal-lab',signal).register('etl-pipeline',etl))
