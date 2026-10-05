from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from . import config
from .routers import admin, cart, orders, products, wishlist

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])
app = FastAPI(title="YUPEK API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=800)
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_credentials=True,
                   allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"])

for r in (products.router, cart.router, wishlist.router, orders.router, admin.router):
    app.include_router(r)


@app.get("/")
def root():
    return {"name": "YUPEK Atelier API", "status": "online", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health():
    return {"ok": True, "payments": bool(config.STRIPE_SECRET_KEY)}


@app.exception_handler(RuntimeError)
async def runtime_error(_: Request, exc: RuntimeError):
    return JSONResponse({"detail": str(exc)}, status_code=500)
