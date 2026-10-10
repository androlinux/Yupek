from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..auth import admin_only, cron_only
from ..db import get_db
from ..suppliers.sync import sync_supplier
from ..suppliers.promio_sync import sync_promio_catalog

router = APIRouter(tags=["admin"])


class StatusIn(BaseModel):
    status: str  # active | draft | archived


@router.post("/api/admin/suppliers/{supplier_id}/sync", dependencies=[Depends(admin_only)])
def admin_sync(supplier_id: str):
    s = get_db().table("suppliers").select("*").eq("id", supplier_id).eq("active", True).limit(1).execute().data
    if not s:
        raise HTTPException(404, "Supplier not found")
    return sync_supplier(s[0])


@router.patch("/api/admin/products/{product_id}/status", dependencies=[Depends(admin_only)])
def set_status(product_id: str, body: StatusIn):
    if body.status not in ("active", "draft", "archived"):
        raise HTTPException(400, "Invalid status")
    get_db().table("products").update({"status": body.status}).eq("id", product_id).execute()
    return {"ok": True}


@router.post("/api/cron/sync-suppliers", dependencies=[Depends(cron_only)])
def cron_sync():
    suppliers = get_db().table("suppliers").select("*").eq("active", True).execute().data
    return {s["name"]: sync_supplier(s) for s in suppliers}


@router.api_route("/api/cron/promio-sync", methods=["GET", "POST"], dependencies=[Depends(cron_only)])
def cron_promio_sync():
    """Scheduled Promio catalog synchronization endpoint.

    Called by hosting cron jobs (e.g. Vercel Cron).
    Secured by CRON_SECRET (via Authorization: Bearer or X-Cron-Secret header).
    Respects PROMIO_CATALOG_SYNC_ENABLED feature flag.
    Order submission is strictly disabled.
    """
    return sync_promio_catalog(dry_run=False)
