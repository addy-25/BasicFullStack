# integrations/base.py

from abc import ABC, abstractmethod

class OAuthProvider(ABC):
    """
    Abstract base class for all OAuth integrations.

    Every provider (GitHub, Slack, Jira, Linear) must implement
    these four methods. The routes in main.py only talk to this
    interface — they never know which specific provider they're
    calling. That's the point.

    ABC means Abstract Base Class — Python will raise an error
    if you create a subclass that doesn't implement all the
    @abstractmethod methods. Catches mistakes at startup, not runtime.
    """

    # Every provider must declare its name.
    # Used as the URL param: /integrations/github/...
    name: str = ""

    # The OAuth scopes this provider needs.
    # GitHub uses "repo,read:user", Slack uses "channels:read", etc.
    scopes: str = ""

    @abstractmethod
    def get_oauth_url(self, state: str) -> str:
        """
        Build and return the authorization URL.
        User's browser is redirected here to approve the connection.

        state = the user_id, echoed back in the callback.
        """
        pass

    @abstractmethod
    def exchange_code(self, code: str) -> dict:
        """
        Exchange the one-time code for an access_token.
        Called in the callback route after user approves.

        Returns a dict with at minimum:
          { "access_token": "...", "username": "..." }

        Each provider puts different things here but access_token
        and username are required by the base system.
        """
        pass

    @abstractmethod
    def get_user_info(self, access_token: str) -> dict:
        """
        Fetch the user's profile from the provider using their token.
        Used to get their username/display name for storage.

        Returns a dict with at minimum:
          { "username": "addy-25", "display_name": "Aditya" }
        """
        pass

    @abstractmethod
    def close_item(self, access_token: str, source_url: str) -> bool:
        """
        Mark the original item as done in the source system.
        Called when user completes a task that came from this provider.

        source_url = the URL of the original item
        e.g. "https://github.com/user/repo/issues/42"

        Returns True if successful, False if failed.
        """
        pass
