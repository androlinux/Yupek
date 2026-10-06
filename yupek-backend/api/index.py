import os
import sys

# Ensure project root is on sys.path for Vercel Serverless Function runtime
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.main import app
