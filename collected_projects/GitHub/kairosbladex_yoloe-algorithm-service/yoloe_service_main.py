"""Production entry point for the algorithm service.

The private model runtime is supplied by the deployment image.  API import is
kept lazy enough for this process to expose an honest degraded health result
while that runtime is absent, which makes image/build checks useful offline.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from fastapi import FastAPI

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(title="YOLOE Algorithm Service", version="mvp-spatial-1")
    app.state.router_errors = []
    try:
        from api import router as main_router

        app.include_router(main_router, prefix="/api/v1")
        from api.retrieval_batch import router as batch_router

        app.include_router(batch_router, prefix="/api/v1")
        from api.vl_compare import router as compare_router

        app.include_router(compare_router, prefix="/api/v1")
        from api.review_agent_routes import router as review_router

        app.include_router(review_router, prefix="/api/v1")
    except Exception as exc:  # keep a useful health endpoint for bad images
        logger.exception("failed to load API routers")
        app.state.router_errors.append(f"{type(exc).__name__}: {exc}")

    if not any(getattr(route, "path", None) == "/api/v1/health" for route in app.routes):

        @app.get("/api/v1/health", include_in_schema=False)
        async def degraded_health():
            return {
                "success": False,
                "status": "degraded",
                "model_loaded": False,
                "reason": app.state.router_errors[0] if app.state.router_errors else "routers unavailable",
            }

    return app


app = create_app()


def main() -> None:
    import uvicorn

    host = os.environ.get("API_HOST", "0.0.0.0")
    port = int(os.environ.get("API_PORT", "8188"))
    kwargs = {"host": host, "port": port, "log_level": os.environ.get("LOG_LEVEL", "info")}
    cert_file = os.environ.get("SSL_CERT_FILE", "")
    key_file = os.environ.get("SSL_KEY_FILE", "")
    if cert_file and key_file and Path(cert_file).is_file() and Path(key_file).is_file():
        kwargs.update(ssl_certfile=cert_file, ssl_keyfile=key_file)
    else:
        logger.warning("SSL certificate not configured; starting HTTP on %s", port)
    uvicorn.run(app, **kwargs)


if __name__ == "__main__":
    main()
