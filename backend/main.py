from fastapi import FastAPI, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from datetime import datetime, timezone, timedelta

from database import SessionLocal, engine
from models import User, Base, Task
from auth import (
    hash_password, verify_password,
    create_token, verify_token,
    create_refresh_token, rotate_refresh_token, revoke_refresh_token,
)

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