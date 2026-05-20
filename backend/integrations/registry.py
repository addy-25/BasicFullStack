# integrations/registry.py

from .github import GitHubProvider
# from .slack  import SlackProvider   ← uncomment when ready
# from .linear import LinearProvider  ← uncomment when ready
# from .jira   import JiraProvider    ← uncomment when ready

# Maps the URL param → provider class
PROVIDERS = {
    "github": GitHubProvider(),
    # "slack":  SlackProvider(),
    # "linear": LinearProvider(),
    # "jira":   JiraProvider(),
}

def get_provider(name: str):
    """
    Look up a provider by name.
    Raises 404 if provider not found or not yet enabled.

    Usage in routes:
        provider = get_provider("github")   → GitHubProvider instance
        provider = get_provider("slack")    → SlackProvider instance
        provider = get_provider("unknown")  → raises HTTPException 404
    """
    provider = PROVIDERS.get(name)
    if not provider:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=404,
            detail=f"Integration '{name}' not found or not enabled"
        )
    return provider