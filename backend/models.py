from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Float,
    DateTime,
    ForeignKey
)

from sqlalchemy.orm import relationship

from datetime import datetime

from database import Base


class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True)

    email = Column(String, unique=True)

    password = Column(String)

    tasks = relationship("Task", back_populates="owner")


class Task(Base):

    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True)

    title = Column(String)

    energy_level = Column(String, default="medium")

    completed = Column(Boolean, default=False)

    priority_weight = Column(Float, default=1)

    due_date = Column(DateTime, nullable=True)

    timer_minutes = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="tasks")