from .base import SupplierAdapter
from .mock import MockSupplier
from .promio import PromioAdapter

# Register new suppliers here: "cjdropshipping": CJAdapter, "printful": PrintfulAdapter ...
ADAPTERS: dict[str, type[SupplierAdapter]] = {
    "mock": MockSupplier,
    "promio": PromioAdapter,
}


def get_adapter(supplier: dict) -> SupplierAdapter:
    cls = ADAPTERS.get(supplier["type"])
    if not cls:
        raise ValueError(f"No adapter for supplier type '{supplier['type']}'")
    return cls(supplier.get("config") or {})
