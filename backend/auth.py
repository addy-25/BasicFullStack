from passlib.context import CryptContext
from jose import jwt,JWTError
from datetime import datetime, timedelta,timezone
import os

SECRET_KEY = "mysecretkey"

pwd_context = CryptContext(schemes=["bcrypt"])

def hash_password(password):
    return pwd_context.hash(password)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def create_token(user_id):

    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=1)
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm="HS256"
    )

    return token
def verify_token(token):
    try:
        payload=jwt.decode(
            token,
            SECRET_KEY,
            algorithms=["HS256"]
        )
        return payload["user_id"]
    except JWTError:
        return None