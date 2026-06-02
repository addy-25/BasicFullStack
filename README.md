# Gravitas — AI-Powered Task Manager

> A production-ready full-stack task manager that turns GitHub issues into prioritized tasks, automates triage via an AI agent, and exposes everything through an MCP server for natural language control.

---

## What It Does

Gravitas connects your development workflow to your task list. When a GitHub issue is assigned to you, it automatically appears in your notifications inbox. You review it, accept it with one click, and it becomes a task on your dashboard — with priority, energy level, and due date already filled in.

On top of that, an AI agent (powered by Claude) can read your tasks, triage your inbox, and plan your day autonomously. The same functionality is exposed as an MCP server so Claude Desktop can control your task manager through natural language.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          GRAVITAS                                   │
│                                                                     │
│   ┌──────────────┐     ┌───────────────────┐     ┌──────────────┐  │
│   │   React       │────▶│    FastAPI         │────▶│  PostgreSQL  │  │
│   │   Frontend    │◀────│    Backend         │◀────│  (todoapp)   │  │
│   │   :5173       │     │    :8000           │     └──────────────┘  │
│   └──────────────┘     └────────┬──────────┘                       │
│                                  │              ┌──────────────┐    │
│                                  ├─────────────▶│    Redis      │    │
│                                  │              │ (auth tokens) │    │
│                                  │              └──────────────┘    │
│   ┌──────────────┐              │                                   │
│   │  GitHub API   │◀─────────────┤  OAuth 2.0 + Webhooks            │
│   └──────────────┘              │                                   │
│                                  │                                   │
│   ┌──────────────┐              │                                   │
│   │  Slack API    │◀─────────────┤  OAuth 2.0                        │
│   └──────────────┘              │                                   │
│                                  │                                   │
│   ┌──────────────┐              │  Tool-use loop                    │
│   │ Anthropic API │◀─────────────┤  (agentic AI)                     │
│   └──────────────┘              │                                   │
│                                  │                                   │
│   ┌──────────────┐              │  stdio transport                  │
│   │ Claude Desktop│◀─────────────┘  (MCP server)                    │
│   └──────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Flows

### 1. Authentication

```
User logs in → FastAPI verifies password (bcrypt)
             → Issues JWT access token (15 min)
             → Stores refresh token in Redis (7 days)
             → Frontend saves JWT in localStorage
             → Every API call sends: Authorization: Bearer <token>
```

### 2. GitHub Issue → Task

```
Issue assigned to you on GitHub
        │
        ▼
GitHub fires webhook POST → ngrok tunnel → FastAPI
        │
        ▼
Backend verifies HMAC-SHA256 signature
        │
        ▼
Looks up GitHub username in integration_connections table
        │
        ▼
Creates IntegrationItem (status = "inbox")
        │
        ▼
You open Notifications page → see the issue
        │
        ├── Click Accept → Task created on Dashboard ✓
        └── Click Dismiss → Item removed from inbox
```

### 3. OAuth Connection Flow

```
Click "Connect GitHub" in Settings
        │
        ▼
Frontend → GET /integrations/github/oauth-url → Backend
        │
        ▼
Backend builds GitHub authorize URL (state = your user ID)
        │
        ▼
Browser redirects to github.com/login/oauth/authorize
        │
        ▼
You click "Authorize" on GitHub
        │
        ▼
GitHub redirects → /integrations/github/callback?code=xxx&state=<user_id>
        │
        ▼
Backend exchanges code for access token (server-to-server, secret never exposed)
        │
        ▼
Token saved to integration_connections table
        │
        ▼
Redirected to /settings?github=connected → card shows "Connected ✓"
```

### 4. AI Agent Flow

```
User: "What should I work on today?"
        │
        ▼
Agent calls list_tasks() → sees 5 tasks, 1 overdue
Agent calls get_inbox()  → sees 1 urgent GitHub issue
Agent calls accept_notification(id=7) → creates task
        │
        ▼
Agent: "You have 1 overdue task: 'Fix auth bug' (due yesterday).
        I accepted a critical security issue from GitHub.
        Start with the security patch — it's marked urgent."
```

### 5. MCP Server Flow

```
Claude Desktop: "Show me my Gravitas tasks"
        │
        ▼
MCP client → stdio → mcp_server.py
        │
        ▼
mcp_server.py → HTTP → FastAPI GET /tasks
        │
        ▼
Returns formatted task list directly in Claude Desktop
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI, Python 3.11 |
| Database | PostgreSQL 15 + SQLAlchemy ORM |
| Auth | JWT (python-jose) + Redis refresh tokens |
| Password hashing | bcrypt (passlib) |
| Frontend | React + Vite |
| Integrations | GitHub OAuth 2.0, Slack OAuth 2.0 |
| Webhooks | HMAC-SHA256 verified, ngrok for local dev |
| AI Agent | Anthropic Claude API (tool-use loop) |
| MCP Server | FastMCP (stdio transport) |
| Containerization | Docker + Docker Compose |
| Tunnel | ngrok (webhook dev) |
| Testing | pytest, TestClient, in-memory SQLite |
| CI/CD | GitHub Actions |

---

## Project Structure

```
Basic/
├── backend/
│   ├── main.py                  # All API routes
│   ├── models.py                # SQLAlchemy models
│   ├── auth.py                  # JWT + Redis token logic
│   ├── database.py              # DB connection
│   ├── config.py                # Env vars
│   ├── agent.py                 # Agentic AI layer (Claude API)
│   ├── mcp_server.py            # MCP server (7 tools)
│   ├── integrations/
│   │   ├── base.py              # Abstract BaseProvider
│   │   ├── github.py            # GitHub OAuth + API
│   │   ├── slack.py             # Slack OAuth + API
│   │   └── registry.py          # Provider lookup map
│   └── tests/
│       ├── conftest.py          # Fixtures, test DB setup
│       ├── test_auth.py         # Signup, login, token tests
│       ├── test_tasks.py        # CRUD + ownership security
│       └── test_notifications.py # Inbox, accept, dismiss
│
├── frontend/
│   └── src/
│       ├── App.jsx              # Routes
│       ├── Sidebar.jsx          # Navigation
│       └── pages/
│           ├── Dashboard.jsx    # Task decay view
│           ├── Notifications.jsx # Inbox
│           └── settings/
│               ├── Settings.jsx
│               └── Integrations.jsx # OAuth connect cards
│
├── docker-compose.yml           # Full stack: DB + Redis + Backend + Frontend + ngrok
└── .github/
    └── workflows/
        └── ci.yml               # Runs pytest on every push
```

---

## Database Schema

```
users
  id, email, password

tasks
  id, title, energy_level, completed,
  priority_weight, due_date, timer_minutes,
  created_at, owner_id → users.id

integration_connections
  id, owner_id → users.id,
  provider (github | slack | linear),
  access_token, username,
  connected_at, is_active

integration_items
  id, owner_id → users.id,
  source, source_id, source_url,
  title, body, suggested_energy,
  suggested_due, status (inbox | accepted | dismissed),
  received_at, task_id → tasks.id
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Create account |
| POST | `/login` | Login, get JWT + refresh cookie |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/logout` | Revoke refresh token |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | List all tasks for current user |
| POST | `/tasks` | Create a task |
| PUT | `/tasks/{id}` | Update task |
| PATCH | `/tasks/{id}/complete` | Toggle completion |
| DELETE | `/tasks/{id}` | Delete task |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List inbox items |
| POST | `/notifications/{id}/accept` | Accept → creates task |
| POST | `/notifications/{id}/dismiss` | Dismiss item |

### Integrations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/integrations/{provider}/oauth-url` | Get OAuth redirect URL |
| GET | `/integrations/{provider}/callback` | OAuth callback (GitHub redirects here) |
| GET | `/integrations/{provider}/status` | Check connection status |
| DELETE | `/integrations/{provider}/disconnect` | Disconnect integration |
| POST | `/integrations/github/webhook` | GitHub webhook receiver |

### AI Agent
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agent/chat` | Chat with AI agent (has access to all your tasks) |

---

## MCP Tools (Claude Desktop)

| Tool | Description |
|------|-------------|
| `list_tasks` | List all your tasks |
| `create_task` | Create a new task |
| `complete_task` | Toggle task completion |
| `get_inbox` | View notifications inbox |
| `accept_notification` | Accept inbox item → create task |
| `dismiss_notification` | Dismiss inbox item |
| `delete_task` | Delete a task |

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15
- Redis 7
- Docker (optional)

### With Docker (recommended)

```bash
git clone https://github.com/addy-25/BasicFullStack
cd BasicFullStack

# Create backend/.env (see below)
cp backend/.env.example backend/.env

# Start everything
docker-compose up --build
```

App runs at `http://localhost:5173`

### Without Docker

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Environment Variables

Create `backend/.env`:

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_WEBHOOK_SECRET=your_webhook_secret

SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret

ANTHROPIC_API_KEY=your_anthropic_api_key

FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://127.0.0.1:8000
```

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

```
tests/test_auth.py::test_signup_success                    PASSED
tests/test_auth.py::test_login_wrong_password              PASSED
tests/test_tasks.py::test_create_task                      PASSED
tests/test_tasks.py::test_cannot_access_other_users_task   PASSED
tests/test_notifications.py::test_accept_creates_task      PASSED
...
22 passed in 1.3s
```

---

## Setting Up Webhooks Locally

```bash
# Start ngrok
ngrok http 8000

# Copy the https URL, e.g. https://abc123.ngrok-free.app
# Go to: github.com/YOUR_REPO/settings/hooks
# Payload URL: https://abc123.ngrok-free.app/integrations/github/webhook
# Content type: application/json
# Secret: your GITHUB_WEBHOOK_SECRET
# Events: Issues only
```

---

## Setting Up MCP (Claude Desktop)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gravitas": {
      "command": "python3",
      "args": [
        "/path/to/backend/mcp_server.py",
        "YOUR_JWT_TOKEN"
      ]
    }
  }
}
```

Restart Claude Desktop. You'll see the Gravitas tools available in the hammer icon 🔨.

---

## Adding a New Integration (Slack, Linear, Jira)

The provider system is designed for easy extension:

```python
# 1. Create backend/integrations/linear.py
class LinearProvider(BaseProvider):
    def get_authorize_url(self, state): ...
    def exchange_code(self, code): ...
    def fetch_items(self, integration): ...

# 2. Register in registry.py
PROVIDERS = {
    "github": GitHubProvider(),
    "slack":  SlackProvider(),
    "linear": LinearProvider(),   # ← add this
}

# 3. Set available: true in frontend/src/pages/settings/Integrations.jsx
{ provider: "linear", available: true, ... }
```

Everything else (OAuth callback, status check, disconnect, notifications page) works automatically.

---

## CI/CD

GitHub Actions runs on every push to `main`:

1. Lints Python with flake8
2. Starts Redis service container
3. Runs full pytest suite
4. Builds Docker image

Red commit = broken tests = no deploy.

---

## License

MIT
