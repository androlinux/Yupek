import jwt
from jwt import PyJWKClient
from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from . import config

bearer = HTTPBearer(auto_error=False)
_jwks = PyJWKClient(f"{config.SUPABASE_URL}/auth/v1/.well-known/jwks.json") if config.SUPABASE_URL else None
ALLOWED = {"HS256", "ES256", "RS256"}


def _decode(token: str) -> dict:
    try:
        alg = jwt.get_unverified_header(token).get("alg")
        if alg not in ALLOWED:
            raise HTTPException(401, "Invalid token")
        if alg == "HS256":
            if not config.JWT_SECRET:
                raise HTTPException(401, "Invalid token")
            key = config.JWT_SECRET
        else:
            if _jwks is None:
                raise HTTPException(401, "Invalid token")
            key = _jwks.get_signing_key_from_jwt(token).key
        return jwt.decode(token, key, algorithms=[alg], audience="authenticated")
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict:
    if not creds:
        raise HTTPException(401, "Missing bearer token")
    return _decode(creds.credentials)


def optional_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict | None:
    if not creds:
        return None
    try:
        return _decode(creds.credentials)
    except Exception:
        return None


def admin_only(user: dict = Depends(current_user)) -> dict:
    if user.get("app_metadata", {}).get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user


def cron_only(x_cron_secret: str = Header(default="")) -> None:
    if not config.CRON_SECRET or x_cron_secret != config.CRON_SECRET:
        raise HTTPException(403, "Forbidden")

