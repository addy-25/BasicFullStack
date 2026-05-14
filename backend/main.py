from fastapi import FastAPI, Depends, HTTPException,Request
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from database import SessionLocal, engine
from models import User, Base,Task
from auth import hash_password, verify_password, create_token,verify_token

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],
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

@app.post("/signup")
def signup(data: dict, db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(
        User.email == data["email"]
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )

    new_user = User(
        email=data["email"],
        password=hash_password(data["password"])
    )

    db.add(new_user)
    db.commit()

    return {
        "message": "User created"
    }

@app.post("/login")
def login(data: dict, db: Session = Depends(get_db)):

    user = db.query(User).filter(
        User.email == data["email"]
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email"
        )

    if not verify_password(
        data["password"],
        user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Wrong password"
        )

    token = create_token(user.id)

    return {
        "access_token": token
    }

@app.post("/tasks")
def create_task(
    data:dict,
    request:Request,
    db:Session = Depends(get_db)
):
    auth_header=request.headers.get("Authorization")

    if not auth_header:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing"
        )
    
    token=auth_header.split(" ")[1]

    user_id=verify_token(token)

    if not user_id:

        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )
    
    task=Task(
        title=data['title'],
        owner_id=user_id
    )

    db.add(task)
    db.commit()

    return {
        "message":"Task Created"
    }

@app.get("/tasks")
def get_tasks(
    
    request: Request,
    db: Session = Depends(get_db)
):

    auth_header = request.headers.get("Authorization")

    if not auth_header:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing"
        )
    
    token = auth_header.split(" ")[1]

    user_id = verify_token(token)

    tasks = db.query(Task).filter(
        Task.owner_id == user_id
    ).all()

    return tasks

@app.put("/tasks/{task_id}")
def update_task(
    task_id: int,
    data: dict,
    request: Request,
    db: Session = Depends(get_db)
):

    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing"
        )


    token = auth_header.split(" ")[1]

    user_id = verify_token(token)

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.owner_id == user_id
    ).first()

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    task.title = data["title"]

    db.commit()

    return {
        "message": "Task updated"
    }


@app.delete("/tasks/{task_id}")
def delete_task(
    task_id:int,
    request:Request,
    db: Session=Depends(get_db)
):
    auth_header=request.headers.get("Authorization")
    
    if not auth_header:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing"
        )
    token=auth_header.split(" ")[1]

    user_id=verify_token(token)

    task=db.query().filter(
        Task.id==task_id,
        Task.owner_id==user_id
    ).first()

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task was not found"
        )
    db.delete(task)
    db.commit

    return {
        "message":"Task deleted"
    }




