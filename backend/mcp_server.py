import httpx
from mcp.server.fastmcp import FastMCP

# Create the MCP server
mcp = FastMCP("gravitas", description="Gravitas Task Manager — manage tasks and notifications")

# The MCP server talks to your existing FastAPI backend via HTTP
API_BASE = "http://127.0.0.1:8000"
TOKEN    = ""   # set at startup or read from env

def headers():
    return {"Authorization": f"Bearer {TOKEN}"}


# ── TOOL 1: List all tasks ──────────────────────────────────────────
@mcp.tool()
async def list_tasks(include_completed: bool = False) -> str:
    """List all tasks. Shows title, energy level, priority, due date, and completion status."""
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{API_BASE}/tasks", headers=headers())
        tasks = res.json()
    
    if not include_completed:
        tasks = [t for t in tasks if not t["completed"]]
    
    if not tasks:
        return "No tasks found."
    
    lines = []
    for t in tasks:
        status = "✓" if t["completed"] else "○"
        due    = f" (due {t['due_date'][:10]})" if t.get("due_date") else ""
        lines.append(f"{status} [{t['energy_level'].upper()}] {t['title']}{due}")
    
    return "\n".join(lines)


# ── TOOL 2: Create a task ───────────────────────────────────────────
@mcp.tool()
async def create_task(title: str, energy_level: str = "medium", due_date: str = None) -> str:
    """Create a new task. Energy level can be 'low', 'medium', or 'high'."""
    payload = {"title": title, "energy_level": energy_level}
    if due_date:
        payload["due_date"] = due_date
    
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{API_BASE}/tasks", json=payload, headers=headers())
    
    task = res.json()
    return f"Created task: '{task['title']}' (energy: {task['energy_level']}, priority: {task['priority_weight']})"


# ── TOOL 3: Complete a task ─────────────────────────────────────────
@mcp.tool()
async def complete_task(task_id: int) -> str:
    """Mark a task as complete (or toggle it back to incomplete)."""
    async with httpx.AsyncClient() as client:
        res = await client.patch(f"{API_BASE}/tasks/{task_id}/complete", headers=headers())
    
    data = res.json()
    status = "completed" if data["completed"] else "reopened"
    return f"Task {task_id} {status}."


# ── TOOL 4: Get notification inbox ──────────────────────────────────
@mcp.tool()
async def get_inbox() -> str:
    """Get all pending notifications (GitHub issues, Slack messages, etc.) waiting to be accepted or dismissed."""
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{API_BASE}/notifications?status=inbox", headers=headers())
    
    items = res.json()
    if not items:
        return "Inbox is empty."
    
    lines = []
    for item in items:
        lines.append(f"[{item['source'].upper()}] #{item['id']}: {item['title']}")
    
    return "\n".join(lines)


# ── TOOL 5: Accept a notification ───────────────────────────────────
@mcp.tool()
async def accept_notification(item_id: int) -> str:
    """Accept an inbox notification and convert it into a task on the dashboard."""
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{API_BASE}/notifications/{item_id}/accept", json={}, headers=headers())
    
    data = res.json()
    return f"Accepted! Created task: '{data['task']['title']}'"


# ── TOOL 6: Dismiss a notification ─────────────────────────────────
@mcp.tool()
async def dismiss_notification(item_id: int) -> str:
    """Dismiss a notification — removes it from the inbox without creating a task."""
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{API_BASE}/notifications/{item_id}/dismiss", json={}, headers=headers())
    
    return f"Dismissed notification #{item_id}."


# ── TOOL 7: Delete a task ──────────────────────────────────────────
@mcp.tool()
async def delete_task(task_id: int) -> str:
    """Permanently delete a task."""
    async with httpx.AsyncClient() as client:
        res = await client.delete(f"{API_BASE}/tasks/{task_id}", headers=headers())
    
    return f"Deleted task {task_id}."


# ── Run the server ──────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    # Pass your JWT token as argument: python mcp_server.py <token>
    if len(sys.argv) > 1:
        TOKEN = sys.argv[1]
    mcp.run(transport="stdio")