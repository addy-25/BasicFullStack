from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Float,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func          # ← NEW: needed for server_default

from database import Base


class User(Base):
    __tablename__ = "users"

    id       = Column(Integer, primary_key=True)
    email    = Column(String, unique=True)
    password = Column(String)
    tasks    = relationship("Task", back_populates="owner")
    integrations = relationship("IntegrationConnection", back_populates="owner")


class Task(Base):
    __tablename__ = "tasks"

    id              = Column(Integer, primary_key=True)
    title           = Column(String)
    energy_level    = Column(String, default="medium")
    completed       = Column(Boolean, default=False)
    priority_weight = Column(Float, default=1.0)
    due_date        = Column(DateTime, nullable=True)
    timer_minutes   = Column(Float, nullable=True)   
    created_at = Column(
        DateTime,
        server_default=func.now(),   
        default=func.now(),          
    )

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner    = relationship("User", back_populates="tasks")

class IntegrationConnection(Base):
    __tablename__ = "integration_connections"

    id           = Column(Integer,  primary_key=True)
    owner_id     = Column(Integer,  ForeignKey("users.id"))
    provider     = Column(String)
    access_token = Column(String)
    username     = Column(String)
    connected_at = Column(DateTime)
    is_active    = Column(Boolean, default=True)

    owner = relationship("User", back_populates="integrations")