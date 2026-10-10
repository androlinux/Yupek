"""Promio Catalog Synchronization & Health Router.

Endpoints:
- GET  /api/promio/status   - Retrieve sync health and feature flag status
- GET  /api/promio/preview  - Generate a read-only dry-run preview diff of Promio designs
- POST /api/promio/sync     - Trigger catalog synchronization (respects PROMIO_CATALOG_SYNC_ENABLED)

SAFETY:
- Never exposes API credentials, secret keys, or signatures.
- Order submission is strictly disabled.
- Dry-run preview never modifies production or disk.
"""

from typing import Any
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import admin_only
from app.suppliers.promio_sync import (
    get_promio_sync_status,
    sync_promio_catalog,
    PromioSyncError,
)

logger = logging.getLogger("promio_router")
router = APIRouter(prefix="/api/promio", tags=["promio"], dependencies=[Depends(admin_only)])


@router.get("/status")
def get_status() -> dict[str, Any]:
    """Retrieve Promio integration, catalog synchronization, and feature flag metrics."""
    try:
        return get_promio_sync_status()
    except Exception as exc:
        logger.error(f"Error retrieving Promio sync status: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve Promio synchronization status.",
        )


@router.get("/preview")
def preview_catalog_sync() -> dict[str, Any]:
    """Generate a read-only dry-run preview of Promio catalog synchronization.

    Reports new, updated, unchanged, and invalid candidate products without
    writing to Supabase or modifying site-config.json.
    """
    try:
        preview_report = sync_promio_catalog(dry_run=True)
        return preview_report
    except PromioSyncError as exc:
        logger.error(f"Promio preview error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Promio catalog preview failed: {exc}",
        )
    except Exception as exc:
        logger.error(f"Unexpected preview error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error generating Promio catalog preview.",
        )


@router.post("/sync")
def trigger_catalog_sync(
    dry_run: bool = Query(True, description="Set False to perform live catalog sync when feature flag is enabled"),
) -> dict[str, Any]:
    """Trigger Promio catalog synchronization.

    If dry_run=True (default), generates inspection preview without writing.
    If dry_run=False, updates customProducts only if PROMIO_CATALOG_SYNC_ENABLED=true.
    """
    try:
        result = sync_promio_catalog(dry_run=dry_run)
        return result
    except PromioSyncError as exc:
        logger.error(f"Promio sync error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Promio catalog sync failed: {exc}",
        )
    except Exception as exc:
        logger.error(f"Unexpected sync error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error executing Promio catalog synchronization.",
        )
