from .github import GitHubProvider
# Later:  from .slack import SlackProvider   etc.

PROVIDERS = {
    "github": GitHubProvider(),
    # "slack":  SlackProvider(),
    # "jira":   JiraProvider(),
}


def get_provider(name: str):
    provider = PROVIDERS.get(name)
    if not provider:
        raise KeyError(name)
    return provider