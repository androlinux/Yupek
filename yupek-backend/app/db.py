from functools import lru_cache
from supabase import create_client, Client
from . import config


@lru_cache
def get_db() -> Client:
    if not config.SUPABASE_URL or not config.SERVICE_KEY:
        raise RuntimeError("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
    return create_client(config.SUPABASE_URL, config.SERVICE_KEY)
