from .base import SupplierAdapter, SupplierProduct, SupplierVariant


class MockSupplier(SupplierAdapter):
    def list_products(self, cursor=None):
        p = SupplierProduct(
            "MOCK-1", "YUPEK Mock Tee", "Sample supplier product.", "tees", "unisex",
            ["/products/mock-1.jpg"],
            [SupplierVariant(f"MOCK-1-{s}", f"MOCK-1-BLK-{s}", s, "Black", 1800, 25) for s in ("S", "M", "L")], 7)
        return [p], None

    def get_stock(self, ids):
        return {i: 25 for i in ids}

    def create_order(self, order, items):
        return f"MOCK-ORDER-{order['id'][:8]}"

    def get_tracking(self, ref):
        return {"status": "processing", "tracking_number": None}
