from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from datetime import datetime, timezone, timedelta

from database import SessionLocal, engine
from models import User, Base, Task, IntegrationConnection, IntegrationItem
from auth import (
    hash_password, verify_password,
    create_token, verify_token,
    create_refresh_token, rotate_refresh_token, revoke_refresh_token,
)
from config import GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET
from integrations.registry import get_provider


Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


IST = timezone(timedelta(hours=5, minutes=30))
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_user_id_from_request(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    token = auth_header.split(" ")[1]
    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id


def serialize_task(task):
    def fmt(dt):
        if dt is None:
            return None
        
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=IST)
        return dt.isoformat()          

    return {
        "id":              task.id,
        "title":           task.title,
        "energy_level":    task.energy_level,
        "completed":       task.completed,
        "priority_weight": task.priority_weight,
        "due_date":        fmt(task.due_date),
        "timer_minutes":   task.timer_minutes,
        "created_at":      fmt(task.created_at),
    }


PRIORITY_MAP = {"low": 0.8, "medium": 1.0, "high": 1.5}


def utcnow():
  
    return datetime.now(timezone.utc)


@app.post("/signup")
def signup(data: dict, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data["email"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    db.add(User(email=data["email"], password=hash_password(data["password"])))
    db.commit()
    return {"message": "User created"}


@app.post("/login")
def login(data: dict, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data["email"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email")
    if not verify_password(data["password"], user.password):
        raise HTTPException(status_code=401, detail="Wrong password")

    refresh_token = create_refresh_token(user.id)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,
        samesite="lax",
        secure=False,
    )
    return {"access_token": create_token(user.id)}


@app.post("/auth/refresh")
def refresh(request: Request, response: Response):
    old_token = request.cookies.get("refresh_token")
    if not old_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    user_id, new_refresh = rotate_refresh_token(old_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        max_age=7 * 24 * 60 * 60,
        samesite="lax",
        secure=False,
    )
    return {"access_token": create_token(user_id)}


@app.post("/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if token:
        revoke_refresh_token(token)
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}


@app.post("/tasks")
def create_task(data: dict, request: Request, db: Session = Depends(get_db)):
    user_id      = get_user_id_from_request(request)
    energy_level = data.get("energy_level", "medium")

    due_date = None
    if data.get("due_date"):
        
        parsed = datetime.fromisoformat(data["due_date"])
        due_date = parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed

    task = Task(
        title           = data["title"],
        energy_level    = energy_level,
        priority_weight = PRIORITY_MAP.get(energy_level, 1.0),
        due_date        = due_date,
        timer_minutes   = float(data["timer_minutes"]) if data.get("timer_minutes") else None,
        owner_id        = user_id,
        
        created_at      = utcnow(),
    )

    db.add(task)
    db.commit()
    db.refresh(task)
    return serialize_task(task)


@app.get("/tasks")
def get_tasks(request: Request, db: Session = Depends(get_db)):
    user_id = get_user_id_from_request(request)
    tasks   = db.query(Task).filter(Task.owner_id == user_id).all()
    return [serialize_task(t) for t in tasks]


@app.put("/tasks/{task_id}")
def update_task(task_id: int, data: dict, request: Request, db: Session = Depends(get_db)):
    user_id = get_user_id_from_request(request)
    task    = db.query(Task).filter(Task.id == task_id, Task.owner_id == user_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if "title"         in data: task.title         = data["title"]
    if "completed"     in data: task.completed     = data["completed"]
    if "timer_minutes" in data:
        task.timer_minutes = float(data["timer_minutes"]) if data["timer_minutes"] else None

    if "energy_level" in data:
        task.energy_level    = data["energy_level"]
        task.priority_weight = PRIORITY_MAP.get(data["energy_level"], 1.0)

    if "due_date" in data:
        if data["due_date"]:
            parsed = datetime.fromisoformat(data["due_date"])
            task.due_date = parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed
        else:
            task.due_date = None

    db.commit()
    db.refresh(task)
    return {"message": "Task updated", "task": serialize_task(task)}


@app.patch("/tasks/{task_id}/complete")
def complete_task(task_id: int, request: Request, db: Session = Depends(get_db)):
    user_id = get_user_id_from_request(request)
    task    = db.query(Task).filter(Task.id == task_id, Task.owner_id == user_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.completed = not task.completed
    db.commit()
    db.refresh(task)
    return {"message": "Task updated", "completed": task.completed}


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, request: Request, db: Session = Depends(get_db)):
    user_id = get_user_id_from_request(request)
    task    = db.query(Task).filter(Task.id == task_id, Task.owner_id == user_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}




@app.get("/integrations/{provider}/oauth-url")
def integration_oauth_url(provider: str, request: Request):
   
    user_id  = get_user_id_from_request(request)
    p        = get_provider(provider)
    url      = p.get_oauth_url(state=str(user_id))
    return {"url": url}

from datetime import datetime
from zoneinfo import ZoneInfo

now_ist = datetime.now(
    ZoneInfo("Asia/Kolkata")
)
@app.get("/integrations/{provider}/callback")
def integration_callback(
    provider: str,
    code:     str,
    state:    str,
    error:    str = None,
    db:       Session = Depends(get_db)
):
    """
    GitHub, Slack, Linear all redirect back here.
    The {provider} param tells us which one to use.
    """
    frontend_base = "http://localhost:5173/settings"

    if error:
        return RedirectResponse(f"{frontend_base}?{provider}=cancelled")

    user_id = int(state)

    try:
        p         = get_provider(provider)
        token_data = p.exchange_code(code)
        # token_data = { "access_token": "...", "username": "addy-25" }
    except Exception as e:
        print(f"OAuth error for {provider}:", e)
        return RedirectResponse(f"{frontend_base}?{provider}=error")

    # Upsert into IntegrationConnection table
    existing = db.query(IntegrationConnection).filter(
        IntegrationConnection.owner_id == user_id,
        IntegrationConnection.provider == provider,
    ).first()

    if existing:
        existing.access_token = token_data["access_token"]
        existing.username     = token_data["username"]
        existing.connected_at = now_ist
        existing.is_active    = True
    else:
        db.add(IntegrationConnection(
            owner_id        = user_id,
            provider        = provider,
            access_token    = token_data["access_token"],
            username        = token_data["username"],
            connected_at    = now_ist,
            is_active       = True,
        ))

    db.commit()
    return RedirectResponse(f"{frontend_base}?{provider}=connected")


@app.get("/integrations/{provider}/status")
def integration_status(provider: str, request: Request, db: Session = Depends(get_db)):
    user_id = get_user_id_from_request(request)

    connection = db.query(IntegrationConnection).filter(
        IntegrationConnection.owner_id == user_id,
        IntegrationConnection.provider == provider,
        IntegrationConnection.is_active == True,
    ).first()

    return {
        "connected": connection is not None,
        "username":  connection.username if connection else None,
        "provider":  provider,
    }


@app.delete("/integrations/{provider}/disconnect")
def integration_disconnect(provider: str, request: Request, db: Session = Depends(get_db)):
    user_id = get_user_id_from_request(request)

    connection = db.query(IntegrationConnection).filter(
        IntegrationConnection.owner_id == user_id,
        IntegrationConnection.provider == provider,
    ).first()

    if connection:
        connection.is_active = False
        db.commit()

    return {"message": f"{provider} disconnected"}

# Add this to main.py

import hmac
import hashlib
import os

GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "")

@app.post("/integrations/github/webhook")
async def github_webhook(request: Request, db: Session = Depends(get_db)):

    # Step 1 — verify it's actually GitHub sending this
    # GitHub signs every webhook payload with your WEBHOOK_SECRET
    # If the signature doesn't match, someone is faking it
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    expected = "sha256=" + hmac.new(
        GITHUB_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Step 2 — parse the payload
    payload  = await request.json()
    action   = payload.get("action")        # "assigned", "closed", "opened"
    issue    = payload.get("issue", {})
    assignee = issue.get("assignee") or {}
    github_username = assignee.get("login") # "addy-25"

    # Step 3 — only care about assignment events
    if action != "assigned" or not github_username:
        return {"ok": True}  # ignore everything else

    # Step 4 — find which TaskDecay user owns this GitHub account
    connection = db.query(IntegrationConnection).filter(
        IntegrationConnection.provider == "github",
        IntegrationConnection.username == github_username,
        IntegrationConnection.is_active == True,
    ).first()

    if not connection:
        return {"ok": True}  # this person hasn't connected GitHub

    # Step 5 — map GitHub labels to energy level
    labels = [l["name"].lower() for l in issue.get("labels", [])]
    if any(l in labels for l in ["high-priority", "urgent", "critical"]):
        energy = "high"
    elif any(l in labels for l in ["low-priority", "minor"]):
        energy = "low"
    else:
        energy = "medium"

    # Step 6 — get due date from milestone if available
    due_date = None
    milestone = issue.get("milestone")
    if milestone and milestone.get("due_on"):
        due_date = datetime.fromisoformat(
            milestone["due_on"].replace("Z", "+00:00")
        )

    # Step 7 — create the inbox item
    # Check it doesn't already exist (GitHub can fire duplicate events)
    existing_item = db.query(IntegrationItem).filter(
        IntegrationItem.owner_id  == connection.owner_id,
        IntegrationItem.source    == "github",
        IntegrationItem.source_id == str(issue["number"]),
    ).first()

    if existing_item:
        return {"ok": True}  # already in inbox, skip

    item = IntegrationItem(
        owner_id         = connection.owner_id,
        source           = "github",
        source_id        = str(issue["number"]),
        source_url       = issue["html_url"],
        title            = issue["title"],
        body             = issue.get("body", ""),
        suggested_energy = energy,
        suggested_due    = due_date,
        status           = "inbox",
        received_at      = now_ist,
    )
    db.add(item)
    db.commit()
    return {"ok": True}

def serialize_item(item):
    return {
        "id":      item.id,
        "source":  item.source,
        "title":   item.title,
        "body":    item.body,
        "url":     item.source_url,
        "energy":  item.suggested_energy,
        "status":  item.status,
        "task_id": item.task_id,
    }


@app.get("/notifications")
def list_notifications(request: Request, status: str = "inbox",
                       db: Session = Depends(get_db)):
    user_id = get_user_id_from_request(request)
    q = db.query(IntegrationItem).filter(IntegrationItem.owner_id == user_id)
    if status != "all":
        q = q.filter(IntegrationItem.status == status)
    items = q.order_by(IntegrationItem.received_at.desc()).all()
    return [serialize_item(i) for i in items]


@app.post("/notifications/{item_id}/accept")
def accept_notification(item_id: int, request: Request,
                        db: Session = Depends(get_db)):
    user_id = get_user_id_from_request(request)
    item = db.query(IntegrationItem).filter(
        IntegrationItem.id == item_id,
        IntegrationItem.owner_id == user_id,
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")
    if item.status == "accepted":
        raise HTTPException(400, "Already accepted")

    energy = item.suggested_energy or "medium"
    task = Task(
        title           = item.title,
        energy_level    = energy,
        priority_weight = PRIORITY_MAP.get(energy, 1.0),
        due_date        = item.suggested_due,
        owner_id        = user_id,
        created_at      = utcnow(),
    )
    db.add(task)
    db.flush()                       # get task.id before commit

    item.status  = "accepted"
    item.task_id = task.id
    db.commit()
    db.refresh(task)
    return {"message": "Task created", "task": serialize_task(task)}


@app.post("/notifications/{item_id}/dismiss")
def dismiss_notification(item_id: int, request: Request,
                         db: Session = Depends(get_db)):
    user_id = get_user_id_from_request(request)
    item = db.query(IntegrationItem).filter(
        IntegrationItem.id == item_id,
        IntegrationItem.owner_id == user_id,
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")
    item.status = "dismissed"
    db.commit()
    return {"message": "Dismissed"}