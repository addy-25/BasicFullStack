from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal, engine
from models import User, Base
from auth import hash_password, verify_password, create_token

Base.metadata.create_all(bind=engine)

app = FastAPI()

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