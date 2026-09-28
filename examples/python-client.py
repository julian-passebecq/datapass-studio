"""A trusted, allowlisted Python evaluator. Not code sent by a browser document."""
from datapass_app import Registry, Evaluation, create_app

def evaluate(req: Evaluation):
    if req.scenarioId != 'standard' or set(req.parameters) != {'travel'}:
        raise ValueError('Unsupported inputs')
    travel=req.parameters['travel']
    if not 1 <= travel <= 8:
        raise ValueError('Outside declared range')
    return {'metrics':[{'id':'stroke','label':'Peak-to-peak travel','value':2*travel,
                        'unit':'m','note':'A prescribed trajectory, not a mechanical validation'}]}

registry=Registry().register('minimal-lab',evaluate)
app=create_app(registry)
# Serve on loopback: uvicorn your_module:app --host 127.0.0.1
