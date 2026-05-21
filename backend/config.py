import os
from dotenv import load_dotenv


load_dotenv()


GITHUB_CLIENT_ID=os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET=os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_WEBHOOK_SECRET=os.getenv("GITHUB_WEBHOOK_SECRET")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL  = os.getenv("BACKEND_URL",  "http://127.0.0.1:8000")

GITHUB_REDIRECT_URI = os.getenv(
    "GITHUB_REDIRECT_URI",
    f"{BACKEND_URL}/integrations/github/callback",
)


