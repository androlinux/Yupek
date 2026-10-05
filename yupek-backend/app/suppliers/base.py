from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class SupplierVariant:
    supplier_variant_id: str
    sku: str
    size: str
    color: str
    cost_cents: int
    stock: int | None = None


@dataclass
class SupplierProduct:
    supplier_product_id: str
    name: str
    description: str
    category: str
    gender: str
    images: list[str] = field(default_factory=list)
    variants: list[SupplierVariant] = field(default_factory=list)
    shipping_days: int | None = None


class SupplierAdapter(ABC):
    """One subclass per supplier (CJ, Printful, Spocket...). The storefront never talks to suppliers."""

    def __init__(self, config: dict):
        self.config = config

    @abstractmethod
    def list_products(self, cursor: str | None = None) -> tuple[list[SupplierProduct], str | None]: ...

    @abstractmethod
    def get_stock(self, supplier_variant_ids: list[str]) -> dict[str, int]: ...

    @abstractmethod
    def create_order(self, order: dict, items: list[dict]) -> str:
        """Returns the supplier's order reference."""

    @abstractmethod
    def get_tracking(self, supplier_order_ref: str) -> dict: ...
