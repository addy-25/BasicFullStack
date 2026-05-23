import requests
from .base import BaseProvider
from config import SLACK_CLIENT_ID, SLACK_CLIENT_SECRET

AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize"
TOKEN_URL     = "https://slack.com/api/oauth.v2.access"
REDIRECT_URI  = "http://localhost:8000/integrations/slack/callback"

class SlackProvider(BaseProvider):

    def get_authorize_url(self, state: str) -> str:
        from urllib.parse import urlencode
        params = {
            "client_id":    SLACK_CLIENT_ID,
            "redirect_uri": REDIRECT_URI,
            "scope":        "channels:history,im:history,users:read,chat:write",
            "state":        state,
        }
        return f"{AUTHORIZE_URL}?{urlencode(params)}"

    def get_oauth_url(self, state: str) -> str:
        return self.get_authorize_url(state)

    def exchange_code(self, code: str) -> dict:
        res = requests.post(TOKEN_URL, data={
            "client_id":     SLACK_CLIENT_ID,
            "client_secret": SLACK_CLIENT_SECRET,
            "redirect_uri":  REDIRECT_URI,
            "code":          code,
        })
        res.raise_for_status()
        data = res.json()

        if not data.get("ok"):
            raise Exception(data.get("error", "Slack OAuth failed"))

        access_token   = data["access_token"]
        authed_user_id = data["authed_user"]["id"]

        # users.info requires users:read scope and returns the installing user's profile
        user_info = requests.get(
            f"https://slack.com/api/users.info?user={authed_user_id}",
            headers={"Authorization": f"Bearer {access_token}"}
        ).json()

        display_name = user_info["user"]["profile"].get("display_name") or \
                       user_info["user"]["profile"].get("real_name", "unknown")

        return {
            "access_token": access_token,
            "username":     display_name,
        }

    def fetch_items(self, token: str) -> list:
        return []