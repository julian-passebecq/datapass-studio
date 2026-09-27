"""Explicit local computation adapters. Browser documents never contain executable code."""
from .server import create_app, Registry, Evaluation, Metric
__all__ = ['create_app', 'Registry', 'Evaluation', 'Metric']
