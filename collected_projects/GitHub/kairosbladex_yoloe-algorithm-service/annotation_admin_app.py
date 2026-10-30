"""Standalone review-annotation console.

This entry point deliberately loads only the review router and the annotation
store. It does not construct YOLO/YOLOE models or start the missing algorithm
service entry point, so the labeling platform can run independently while it
shares the annotation SQLite file and review image directories with the
inference service.

Run locally with::

    python3 annotation_admin_app.py

The default port is 8190. Set ``ANNOTATION_ADMIN_PORT`` and
``REVIEW_ANNOTATION_DB_PATH`` when the platform should use a different port or
an explicitly mounted annotation database.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


ROOT = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT / "frontend"
ROUTES_PATH = ROOT / "api" / "review_agent_routes.py"


def _load_review_routes():
    """Load the annotation/review router without importing the ``api`` package.

    The repository's legacy ``api/__init__.py`` still references the removed
    model module. Loading the router by file path keeps this standalone app
    independent from that unrelated package bootstrap and, importantly, from
    model initialization.
    """
    module_name = "review_agent_routes_annotation_admin"
    loaded = sys.modules.get(module_name)
    if loaded is not None:
        return loaded

    spec = importlib.util.spec_from_file_location(module_name, ROUTES_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"无法加载复核路由: {ROUTES_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


review_routes = _load_review_routes()

app = FastAPI(
    title="存疑目标人工标注平台",
    description="独立管理存疑图片、查看模型红框并记录真/假目标标注。",
    version="1.0.0",
)
app.include_router(review_routes.router, prefix="/api/v1/review-agent")

# The page is self-contained HTML/CSS/JS. The static mount also makes the
# source page directly reachable for operators who bookmark that path.
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="annotation-frontend")


@app.get("/", include_in_schema=False)
@app.get("/annotation_admin.html", include_in_schema=False)
def annotation_console() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "annotation_admin.html", media_type="text/html")


if __name__ == "__main__":
    import os

    import uvicorn

    uvicorn.run(
        app,
        host=os.getenv("ANNOTATION_ADMIN_HOST", "0.0.0.0"),
        port=int(os.getenv("ANNOTATION_ADMIN_PORT", "8190")),
    )
