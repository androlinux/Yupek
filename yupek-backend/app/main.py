from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from . import config
from .routers import admin, cart, orders, printify, products, wishlist

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

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])
app = FastAPI(title="YUPEK API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=800)
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_credentials=True,
                   allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"])

for r in (products.router, cart.router, wishlist.router, orders.router, admin.router, printify.router):
    app.include_router(r)


@app.get("/")
def root():
    return {"name": "YUPEK API", "status": "online", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health():
    return {"ok": True, "payments": bool(config.STRIPE_SECRET_KEY)}


@app.exception_handler(RuntimeError)
async def runtime_error(_: Request, exc: RuntimeError):
    return JSONResponse({"detail": str(exc)}, status_code=500)
