from fastapi import FastAPI, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from database import SessionLocal, engine
from models import User, Base, Task
from auth import hash_password, verify_password, create_token, verify_token
from datetime import datetime

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.post("/signup")
def signup(data: dict, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == data["email"]).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = User(
        email=data["email"],
        password=hash_password(data["password"])
    )
    db.add(new_user)
    db.commit()
    return {"message": "User created"}


@app.post("/login")
def login(data: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data["email"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email")
    if not verify_password(data["password"], user.password):
        raise HTTPException(status_code=401, detail="Wrong password")
    token = create_token(user.id)
    return {"access_token": token}


@app.post("/tasks")
def create_task(data: dict, request: Request, db: Session = Depends(get_db)):
    user_id = get_user_id_from_request(request)

    due_date=None
    if data.get("due_date"):
        due_date=datetime.fromisoformat(data["due_date"])

    priority_map = {
        "low": 0.8,
        "medium": 1,
        "high": 1.5
    }
    energy_level = data.get(
        "energy_level",
        "medium"
    )

    task = Task(
        title=data["title"],
        energy_level=energy_level,
        priority_weight=priority_map.get(
            energy_level,
            1
        ),
        due_date=due_date,
        timer_minutes=data.get("timer_minutes"),
        owner_id=user_id
    )

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@app.get("/tasks")
def get_tasks(
    request: Request,
    db: Session = Depends(get_db)
):

    user_id = get_user_id_from_request(request)

    tasks = db.query(Task).filter(
        Task.owner_id == user_id
    ).all()

    return [
        {
            "id": task.id,
            "title": task.title,
            "energy_level": task.energy_level,
            "completed": task.completed,
            "priority_weight": task.priority_weight,
            "due_date": task.due_date,
            "timer_minutes": task.timer_minutes,
            "created_at": task.created_at
        }
        for task in tasks
    ]


from datetime import datetime

@app.put("/tasks/{task_id}")
def update_task(
    task_id: int,
    data: dict,
    request: Request,
    db: Session = Depends(get_db)
):

    user_id = get_user_id_from_request(request)

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.owner_id == user_id
    ).first()

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    if "title" in data:
        task.title = data["title"]

    if "energy_level" in data:

        task.energy_level = data["energy_level"]

        priority_map = {
            "low": 0.8,
            "medium": 1,
            "high": 1.5
        }

        task.priority_weight = priority_map.get(
            data["energy_level"],
            1
        )

    if "completed" in data:
        task.completed = data["completed"]

    if "due_date" in data:

        if data["due_date"]:
            task.due_date = datetime.fromisoformat(
                data["due_date"]
            )
        else:
            task.due_date = None

    if "timer_minutes" in data:

        task.timer_minutes = data["timer_minutes"]

    db.commit()

    db.refresh(task)

    return {
        "message": "Task updated",
        "task": {
            "id": task.id,
            "title": task.title,
            "energy_level": task.energy_level,
            "completed": task.completed,
            "priority_weight": task.priority_weight,
            "due_date": task.due_date,
            "timer_minutes": task.timer_minutes,
            "created_at": task.created_at
        }
    }


@app.patch("/tasks/{task_id}/complete")
def complete_task(
    task_id: int,
    request: Request,
    db: Session = Depends(get_db)
):

    user_id = get_user_id_from_request(request)

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.owner_id == user_id
    ).first()

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    task.completed = not task.completed

    db.commit()

    db.refresh(task)

    return {
        "message": "Task updated",
        "completed": task.completed
    }


# ── FIXED: delete had db.query() missing Task + db.commit missing () ──
@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, request: Request, db: Session = Depends(get_db)):
    user_id = get_user_id_from_request(request)
    task = db.query(Task).filter(Task.id == task_id, Task.owner_id == user_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}