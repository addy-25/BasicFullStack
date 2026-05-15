from sqlalchemy import Column, Integer, String, ForeignKey,Boolean
from database import Base
from sqlalchemy.orm import relationship

class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    password = Column(String)
    tasks = relationship("Task", back_populates="owner")


class Task(Base):
    __tablename__ = "tasks"

    id= Column(Integer,primary_key=True)
    title=Column(String,nullable=False)
    completed=Column(Boolean,default=False)
    owner_id=Column(Integer,ForeignKey("users.id"))
    owner=relationship("User",back_populates="tasks")

    