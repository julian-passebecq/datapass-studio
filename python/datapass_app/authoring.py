"""Declarative authoring helpers for Datapass Studio.

This module produces inert JSON. It does not execute browser code, shell commands,
SQL, notebooks, or arbitrary Python received from a client document.
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Any, Literal
import json
import math
import re

_ID = re.compile(r"^[a-z][a-zA-Z0-9_.-]{0,127}$")

def _id(value: str, what: str = "id") -> str:
    if not isinstance(value, str) or not _ID.fullmatch(value):
        raise ValueError(f"invalid {what}: {value!r}")
    return value

def _text(value: str, what: str, limit: int = 4000) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise ValueError(f"invalid {what}")
    return value.strip()

@dataclass(frozen=True)
class NumberParameter:
    id: str
    label: str
    default: float
    minimum: float
    maximum: float
    step: float
    unit: str = ""
    group: str = "Parameters"
    affects: tuple[str, ...] = ("evaluation",)
    note: str = ""
    def __post_init__(self) -> None:
        _id(self.id, "parameter id"); _text(self.label, "parameter label", 200)
        values=(self.default,self.minimum,self.maximum,self.step)
        if isinstance(self.default, bool) or not all(isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(float(x)) for x in values):
            raise ValueError("parameter values must be finite numbers")
        if self.minimum > self.maximum or self.step <= 0 or not self.minimum <= self.default <= self.maximum:
            raise ValueError("invalid parameter bounds")
        if not isinstance(self.unit,str) or len(self.unit)>80 or not isinstance(self.group,str) or len(self.group)>160 or not isinstance(self.note,str) or len(self.note)>4000:
            raise ValueError("invalid parameter metadata")
        if len(self.affects)>16 or len(set(self.affects))!=len(self.affects) or any(not isinstance(x,str) or not x or len(x)>120 for x in self.affects):
            raise ValueError("invalid affects list")
    def json(self) -> dict[str, Any]:
        return {"id":self.id,"label":self.label,"default":self.default,"min":self.minimum,"max":self.maximum,"step":self.step,"unit":self.unit,"group":self.group,"affects":list(self.affects),"note":self.note}

@dataclass(frozen=True)
class ViewSpec:
    id: str
    label: str
    kind: Literal["lab","plans","compare","references","data","explain","custom"] = "custom"
    icon: str = "panel"
    description: str = ""
    def __post_init__(self) -> None:
        _id(self.id,"view id"); _text(self.label,"view label",120)
        if self.kind not in {"lab","plans","compare","references","data","explain","custom"}: raise ValueError("invalid view kind")
        if not isinstance(self.icon,str) or len(self.icon)>120 or not isinstance(self.description,str) or len(self.description)>4000: raise ValueError("invalid view metadata")

@dataclass(frozen=True)
class TaskSpec:
    id: str
    label: str
    input_nodes: tuple[str, ...] = ()
    output_nodes: tuple[str, ...] = ()
    revision_guarded: bool = True
    cancellable: bool = True
    def __post_init__(self) -> None:
        _id(self.id,"task id"); _text(self.label,"task label",160)
        if not isinstance(self.revision_guarded,bool) or not isinstance(self.cancellable,bool): raise ValueError("invalid task policy")
        if len(self.input_nodes)>200 or len(self.output_nodes)>200 or len(set(self.input_nodes))!=len(self.input_nodes) or len(set(self.output_nodes))!=len(self.output_nodes): raise ValueError("invalid task nodes")
        for node in (*self.input_nodes,*self.output_nodes): _id(node,"node id")

@dataclass(frozen=True)
class ArtifactBinding:
    id: str
    title: str
    kind: Literal["figure","document-region","image","code","table"]
    entity_ids: tuple[str, ...] = ()
    document_id: str | None = None
    page: int | None = None
    phase: float | None = None
    source_kind: Literal["synthetic","private-reference","user-reference","derived"] = "derived"
    def __post_init__(self) -> None:
        _id(self.id,"artifact id"); _text(self.title,"artifact title",200)
        if self.kind not in {"figure","document-region","image","code","table"}: raise ValueError("invalid artifact kind")
        for entity in self.entity_ids: _id(entity,"entity id")
        if self.document_id is not None: _id(self.document_id,"document id")
        if self.page is not None and (not isinstance(self.page,int) or self.page<1 or self.page>100000): raise ValueError("invalid page")
        if self.phase is not None and (isinstance(self.phase,bool) or not isinstance(self.phase,(int,float)) or not math.isfinite(float(self.phase)) or not 0<=self.phase<=1): raise ValueError("invalid phase")
        if self.source_kind not in {"synthetic","private-reference","user-reference","derived"}: raise ValueError("invalid source kind")

@dataclass
class StudioApp:
    id: str
    title: str
    version: str = "0.1.0"
    description: str = ""
    classification: Literal["synthetic","private"] = "synthetic"
    parameters: list[NumberParameter] = field(default_factory=list)
    views: list[ViewSpec] = field(default_factory=list)
    tasks: list[TaskSpec] = field(default_factory=list)
    artifacts: list[ArtifactBinding] = field(default_factory=list)
    def __post_init__(self) -> None:
        _id(self.id,"app id"); _text(self.title,"app title",200)
        _text(self.version,"app version",100)
        if not isinstance(self.description,str) or len(self.description)>4000: raise ValueError("invalid description")
        if self.classification not in {"synthetic","private"}: raise ValueError("invalid classification")
    def parameter(self,spec:NumberParameter)->"StudioApp": self._append_unique(self.parameters,spec,"parameter"); return self
    def view(self,spec:ViewSpec)->"StudioApp": self._append_unique(self.views,spec,"view"); return self
    def task(self,spec:TaskSpec)->"StudioApp": self._append_unique(self.tasks,spec,"task"); return self
    def artifact(self,spec:ArtifactBinding)->"StudioApp": self._append_unique(self.artifacts,spec,"artifact"); return self
    @staticmethod
    def _append_unique(items:list[Any],item:Any,kind:str)->None:
        if any(x.id==item.id for x in items): raise ValueError(f"duplicate {kind} id: {item.id}")
        items.append(item)
    def manifest(self)->dict[str,Any]:
        if not self.views: raise ValueError("at least one view is required")
        parameter_ids={p.id for p in self.parameters}
        for task in self.tasks:
            missing=[x for x in task.input_nodes if x.startswith("parameter.") and x.removeprefix("parameter.") not in parameter_ids]
            if missing: raise ValueError(f"task {task.id} references unknown parameters: {missing}")
        return {"format":"datapass.studio.app","schemaVersion":1,"id":self.id,"title":self.title,"version":self.version,"description":self.description,"classification":self.classification,"parameters":[p.json() for p in self.parameters],"views":[asdict(v) for v in self.views],"tasks":[asdict(t) for t in self.tasks],"artifacts":[asdict(a) for a in self.artifacts]}
    def dumps(self,*,indent:int=2)->str:
        return json.dumps(self.manifest(),ensure_ascii=False,indent=indent,sort_keys=True)