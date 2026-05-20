
import os
import requests
from .base import OAuthProvider

GITHUB_CLIENT_ID     = os.getenv("GITHUB_CLIENT_ID",     "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")


class GitHubProvider(OAuthProvider):

    name   = "github"
    scopes = "repo,read:user"

    def get_oauth_url(self, state: str) -> str:
        return (
            "https://github.com/login/oauth/authorize"
            f"?client_id={GITHUB_CLIENT_ID}"
            f"&scope={self.scopes}"
            f"&state={state}"
        )

    def exchange_code(self, code: str) -> dict:
        response = requests.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id":     GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code":          code,
            },
            headers={"Accept": "application/json"}
        )
        data = response.json()

        if "access_token" not in data:
            raise ValueError(f"GitHub token exchange failed: {data}")

        # Fetch username immediately — we need it for webhook matching
        user_info = self.get_user_info(data["access_token"])

        return {
            "access_token": data["access_token"],
            "username":     user_info["username"],
            "display_name": user_info["display_name"],
        }

    def get_user_info(self, access_token: str) -> dict:
        response = requests.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"}
        ).json()

        return {
            "username":     response.get("login", ""),
            # login = "addy-25"
            "display_name": response.get("name", response.get("login", "")),
            # name  = "Aditya Sharma" (full name, may be empty)
        }

    def close_item(self, access_token: str, source_url: str) -> bool:
        """
        source_url = "https://github.com/addy-25/repo/issues/42"
        Split it to get owner, repo, issue number.
        """
        try:
            parts        = source_url.rstrip("/").split("/")
            issue_number = parts[-1]   # "42"
            repo         = parts[-3]   # "repo"
            owner        = parts[-4]   # "addy-25"

            response = requests.patch(
                f"https://api.github.com/repos/{owner}/{repo}/issues/{issue_number}",
                json={"state": "closed"},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            return response.status_code == 200
        except Exception as e:
            print(f"GitHub close_item failed: {e}")
            return False