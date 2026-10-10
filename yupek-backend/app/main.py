from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.types import ASGIApp, Receive, Scope, Send
from . import config
from .routers import admin, cart, orders, printify, products, promio, wishlist

# Ensure Starlette Config supports UTF-8 on Windows
import starlette.config

_orig_read_file = starlette.config.Config._read_file


def _safe_read_file(self, file_name):
    file_values = {}
    try:
        with open(file_name, encoding="utf-8", errors="replace") as input_file:
            for line in input_file.readlines():
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    file_values[key.strip()] = value.strip().strip("\"'")
        return file_values
    except Exception:
        return _orig_read_file(self, file_name)


starlette.config.Config._read_file = _safe_read_file


import urllib.parse


class VercelPathMiddleware:
    """Restores the original request path when running on Vercel.
    Handles both:
    1. Query string rewrite: /api/index.py?__path=$1
    2. Vercel edge header: x-matched-path
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope.get("type") in ("http", "websocket"):
            # 1. Check if rewritten with __path parameter
            qs_bytes = scope.get("query_string", b"")
            restored = False
            if qs_bytes:
                try:
                    params = urllib.parse.parse_qs(qs_bytes.decode("utf-8"), keep_blank_values=True)
                    raw_path = params.pop("__path", [None])[0]
                    if raw_path is not None:
                        clean_path = "/" + raw_path.lstrip("/")
                        scope["path"] = clean_path
                        scope["raw_path"] = clean_path.encode("utf-8")
                        new_qs = urllib.parse.urlencode([(k, v) for k, vs in params.items() for v in vs])
                        scope["query_string"] = new_qs.encode("utf-8")
                        restored = True
                except Exception:
                    pass

            # 2. Check x-matched-path header fallback
            if not restored:
                headers = dict(scope.get("headers", []))
                matched_path = headers.get(b"x-matched-path")
                if matched_path:
                    decoded = matched_path.decode("utf-8").split("?")[0]
                    if decoded and decoded not in ("/api/index.py", "/api/index"):
                        clean_path = "/" + decoded.lstrip("/")
                        scope["path"] = clean_path
                        scope["raw_path"] = clean_path.encode("utf-8")

        await self.app(scope, receive, send)


limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])
app = FastAPI(title="YUPEK API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(VercelPathMiddleware)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=800)
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_credentials=True,
                   allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"])

for r in (products.router, cart.router, wishlist.router, orders.router, admin.router, printify.router, promio.router):
    app.include_router(r)


@app.get("/api/index.py")
@app.get("/api/index")
def vercel_entrypoint_info(request: Request):
    matched = request.headers.get("x-matched-path", "/")
    return {"name": "YUPEK API", "status": "online", "matched_path": matched}


@app.get("/")
def root():
    return {"name": "YUPEK API", "status": "online", "docs": "/docs", "health": "/health"}


@app.get("/health")
@app.get("/api/health")
def health():
    return {"ok": True, "payments": bool(config.STRIPE_SECRET_KEY)}


@app.exception_handler(RuntimeError)
async def runtime_error(_: Request, exc: RuntimeError):
    return JSONResponse({"detail": str(exc)}, status_code=500)
