import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
CRON_SECRET = os.getenv("CRON_SECRET", "")
VAT_RATE = float(os.getenv("VAT_RATE", "0.21"))
SUPPLIER_MARKUP = float(os.getenv("SUPPLIER_MARKUP", "2.2"))
PRINTIFY_API_TOKEN = os.getenv("PRINTIFY_API_TOKEN", "")
PRINTIFY_BASE_URL = os.getenv("PRINTIFY_BASE_URL", "https://api.printify.com/v1").rstrip("/")
PRINTIFY_SHOP_ID = os.getenv("PRINTIFY_SHOP_ID", "")
PRINTIFY_WEBHOOK_SECRET = os.getenv("PRINTIFY_WEBHOOK_SECRET", "")

COUNTRIES = ["Netherlands", "Belgium", "Germany", "France", "Italy", "Spain", "Austria",
             "Denmark", "Sweden", "Finland", "Ireland", "Portugal", "Poland"]
DELIVERY = {"standard": 495, "express": 995}  # cents
FREE_SHIPPING_OVER = 10000  # cents (standard only)
