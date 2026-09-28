from __future__ import annotations
import hashlib
import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Any
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_REQUEST = 65536

class Evaluation(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    version: int = Field(ge=1, le=1)
    requestId: str = Field(pattern=r'^[a-zA-Z0-9_-]{1,100}$')
    clientId: str = Field(pattern=r'^[a-z][a-z0-9-]{1,63}$')
    scenarioId: str = Field(pattern=r'^[a-zA-Z0-9_-]{1,100}$')
    inputRevision: int = Field(ge=0, le=9007199254740991)
    parameters: dict[str, float]

    @field_validator('parameters', mode='before')
    @classmethod
    def parameters_are_finite(cls, value):
        if not isinstance(value, dict) or len(value) > 100:
            raise ValueError('Parameter map exceeds limits')
        for key, number in value.items():
            if not re.fullmatch(r'[a-z][a-zA-Z0-9_.-]{0,79}', key):
                raise ValueError('Invalid parameter id')
            if key in ('__proto__', 'constructor', 'prototype'):
                raise ValueError('Forbidden key')
            if isinstance(number, bool) or not isinstance(number, (int, float)) or not math.isfinite(number):
                raise ValueError('Expected a finite numeric value')
        return value

class Metric(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: str
    label: str
    value: float | None
    unit: str
    note: str

@dataclass(frozen=True)
class RegisteredClient:
    evaluate: Callable[[Evaluation], dict[str, Any]]
    classification: str = 'synthetic'

class Registry:
    """Trusted Python application code registers handlers, never uploaded JSON."""
    def __init__(self):
        self.clients: dict[str, RegisteredClient] = {}

    def register(self, client_id: str, handler: Callable, *, classification='synthetic'):
        if not re.fullmatch(r'[a-z][a-z0-9-]{1,63}', client_id) or client_id in self.clients:
            raise ValueError('Invalid or duplicate client registration')
        if classification not in ('synthetic', 'private') or not callable(handler):
            raise ValueError('Invalid handler or classification')
        self.clients[client_id] = RegisteredClient(handler, classification)
        return self

    def evaluate(self, req: Evaluation):
        entry = self.clients.get(req.clientId)
        if entry is None:
            raise ValueError('This client is not registered on this Python service')
        data = entry.evaluate(req)
        metrics = [Metric.model_validate(m).model_dump() for m in data['metrics']]
        if len(metrics) > 50 or any(m['value'] is not None and not math.isfinite(m['value']) for m in metrics):
            raise ValueError('Invalid metric response')
        encoded = json.dumps(req.parameters, sort_keys=True, separators=(',', ':'), allow_nan=False)
        return {**data, 'version': 1, 'requestId': req.requestId, 'inputRevision': req.inputRevision,
                'clientId': req.clientId, 'metrics': metrics,
                'parameterHash': hashlib.sha256(encoded.encode()).hexdigest(),
                'provenance': {'authority': 'registered-local-python', 'classification': entry.classification,
                               'scientificallyValidated': False}}


def _unique(pairs):
    out = {}
    for k, v in pairs:
        if k in out:
            raise ValueError('Duplicate JSON key')
        out[k] = v
    return out


def create_app(registry: Registry, directory: Path | None = None) -> FastAPI:
    app = FastAPI(title='Datapass Studio local bridge', docs_url=None, redoc_url=None, openapi_url=None)

    @app.middleware('http')
    async def local_boundary(request: Request, call_next):
        # Reject DNS rebinding and cross-origin browser writes. Not a multi-user auth system.
        host = request.url.hostname
        if host not in ('127.0.0.1', 'localhost', '[::1]', '::1', 'testserver'):
            return JSONResponse({'detail': 'Loopback host required'}, status_code=403)
        if request.url.path.startswith('/api/') and request.method not in ('GET', 'HEAD'):
            origin = request.headers.get('origin')
            if origin and origin.rstrip('/') != str(request.base_url).rstrip('/'):
                return JSONResponse({'detail': 'Cross-origin request refused'}, status_code=403)
            if request.headers.get('x-studio-request') != '1':
                return JSONResponse({'detail': 'Explicit Studio request header required'}, status_code=403)
            if request.headers.get('content-type', '').split(';')[0] != 'application/json':
                return JSONResponse({'detail': 'JSON required'}, status_code=415)
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'no-referrer'
        response.headers['Cache-Control'] = 'no-store'
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
        return response

    @app.get('/api/health')
    def health():
        return {'status': 'ok', 'mode': 'local-trusted-clients-only', 'clients': list(registry.clients)}

    @app.post('/api/v1/evaluate')
    async def evaluate(request: Request):
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > MAX_REQUEST:
                raise HTTPException(413, 'Request exceeds 64 KiB')
        try:
            data = json.loads(body, object_pairs_hook=_unique,
                              parse_constant=lambda _: (_ for _ in ()).throw(ValueError('Non-finite JSON')))
            value = Evaluation.model_validate(data)
            # Handler is bounded, local and synchronous. Long jobs need a separate job adapter.
            from starlette.concurrency import run_in_threadpool
            result = await run_in_threadpool(registry.evaluate, value)
            return result
        except (ValueError, TypeError, KeyError) as error:
            # Do not reflect arbitrary payloads, filesystem paths, secrets or validation input values.
            raise HTTPException(422, 'Invalid request or rejected domain parameters') from error

    if directory is not None:
        directory = directory.resolve()
        if not (directory / 'index.html').is_file():
            raise ValueError('Build the browser application first')
        app.mount('/', StaticFiles(directory=directory, html=True), name='studio')
    return app
