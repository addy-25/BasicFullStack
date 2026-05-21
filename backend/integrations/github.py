import requests
from urllib.parse import urlencode

from .base import BaseProvider
from config import GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI


class GitHubProvider(BaseProvider):
    name  = "github"
    label = "GitHub"

    def get_authorize_url(self, state: str) -> str:
        params = {
            "client_id":    GITHUB_CLIENT_ID,
            "redirect_uri": GITHUB_REDIRECT_URI,
            "scope":        "repo",      # needed to read issues; use "public_repo" for public-only
            "state":        state,
        }
        return f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    
        # main.py calls this name — alias to keep both naming styles working
    def get_oauth_url(self, state: str) -> str:
        return self.get_authorize_url(state)

    def exchange_code(self, code: str) -> dict:
        resp = requests.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id":     GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code":          code,
                "redirect_uri":  GITHUB_REDIRECT_URI,
            },
            timeout=15,
        )
        data = resp.json()
        access_token = data.get("access_token")
        if not access_token:
            raise ValueError(f"GitHub token exchange failed: {data}")

        # Look up the connected account's username
        me = requests.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        ).json()

        return {
            "access_token":  access_token,
            "refresh_token": None,
            "account_login": me.get("login"),
            "username": me.get("login")
        }

    def fetch_items(self, integration) -> list[dict]:
        resp = requests.get(
            "https://api.github.com/issues",     # issues assigned to the authed user
            headers={"Authorization": f"Bearer {integration.access_token}"},
            params={"filter": "assigned", "state": "open", "per_page": 50},
            timeout=15,
        )
        resp.raise_for_status()

        items = []
        for issue in resp.json():
            if "pull_request" in issue:          # /issues also returns PRs — skip them
                continue
            items.append({
                "external_id": str(issue["id"]),
                "title":       issue["title"],
                "body":        (issue.get("body") or "")[:1000],
                "url":         issue["html_url"],
            })
        return items