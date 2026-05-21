from abc import ABC, abstractmethod


class BaseProvider(ABC):
    """Implement one subclass per platform (GitHub, Slack, Jira, ...)."""

    name: str = ""         
    label: str = ""         

    @abstractmethod
    def get_authorize_url(self, state: str) -> str:
        """Return the OAuth URL to send the user to."""

    @abstractmethod
    def exchange_code(self, code: str) -> dict:
        """Swap the OAuth `code` for tokens.
        Must return: {access_token, refresh_token (or None), account_login}"""

    @abstractmethod
    def fetch_items(self, integration) -> list[dict]:
        """Pull items from the platform, normalized to:
        [{external_id, title, body, url}, ...]"""