from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Float,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class User(Base):
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True)
    email        = Column(String, unique=True)
    password     = Column(String)
    tasks        = relationship("Task", back_populates="owner")
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
    created_at      = Column(DateTime, server_default=func.now(), default=func.now())

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner    = relationship("User", back_populates="tasks")


class IntegrationConnection(Base):
    __tablename__ = "integration_connections"

    id           = Column(Integer, primary_key=True)
    owner_id     = Column(Integer, ForeignKey("users.id"))
    provider     = Column(String)
    access_token = Column(String)
    username     = Column(String)
    connected_at = Column(DateTime)
    is_active    = Column(Boolean, default=True)

    owner = relationship("User", back_populates="integrations")


class IntegrationItem(Base):
    """Pushed in by a provider webhook — shows in the Notifications inbox."""
    __tablename__ = "integration_items"

    id               = Column(Integer, primary_key=True)
    owner_id         = Column(Integer, ForeignKey("users.id"))
    source           = Column(String)                   # "github" | "slack" | ...
    source_id        = Column(String)                   # e.g. issue number
    source_url       = Column(String, nullable=True)
    title            = Column(String)
    body             = Column(Text, nullable=True)
    suggested_energy = Column(String, default="medium")
    suggested_due    = Column(DateTime, nullable=True)
    status           = Column(String, default="inbox")  # inbox | accepted | dismissed
    received_at      = Column(DateTime, server_default=func.now(), default=func.now())
    task_id          = Column(Integer, ForeignKey("tasks.id"), nullable=True)

    owner = relationship("User")