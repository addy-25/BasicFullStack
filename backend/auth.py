import uuid
import redis
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone

SECRET_KEY = "mysecretkey"
ACCESS_TOKEN_MINUTES = 15
REFRESH_TOKEN_DAYS   = 7

pwd_context  = CryptContext(schemes=["bcrypt"])
redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)


def hash_password(password):
    return pwd_context.hash(password)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)


# ── Access token (JWT, 15 min) ────────────────────────────────────────────────
def create_token(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload["user_id"]
    except JWTError:
        return None


# ── Refresh token (UUID stored in Redis, 7 days) ──────────────────────────────
def create_refresh_token(user_id: int) -> str:
    token = str(uuid.uuid4())
    ttl   = REFRESH_TOKEN_DAYS * 24 * 60 * 60
    redis_client.setex(f"refresh:{token}", ttl, str(user_id))
    return token

def verify_refresh_token(token: str):
    value = redis_client.get(f"refresh:{token}")
    return int(str(value)) if value else None

def revoke_refresh_token(token: str):
    redis_client.delete(f"refresh:{token}")

def rotate_refresh_token(old_token: str):
    user_id = verify_refresh_token(old_token)
    if not user_id:
        return None, None
    revoke_refresh_token(old_token)
    return user_id, create_refresh_token(user_id)
