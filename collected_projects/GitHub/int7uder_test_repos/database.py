from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Mapped, mapped_column
from datetime import datetime

engine = create_engine('sqlite:///data.db', echo=True)

SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass

class Sample(Base):
    __abstract__ = True
    id: Mapped[int] = mapped_column(primary_key=True)
    subject: Mapped[str]
    description: Mapped[str]
    runtime: Mapped[int] = mapped_column(default=0)
    points: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)

class Society(Sample):
    __tablename__ = 'society'
    task_number_1: Mapped[int]
    task_number_2: Mapped[int]
    task_number_3: Mapped[int]
    task_number_4: Mapped[int]
    task_number_5: Mapped[int]
    task_number_6: Mapped[int]
    task_number_7: Mapped[int]
    task_number_8: Mapped[int]
    task_number_9: Mapped[int]
    task_number_10: Mapped[int]
    task_number_11: Mapped[int]
    task_number_12: Mapped[int]
    task_number_13: Mapped[int]
    task_number_14: Mapped[int]
    task_number_15: Mapped[int]
    task_number_16: Mapped[int]
    task_number_17: Mapped[int]
    task_number_18: Mapped[int]
    task_number_19: Mapped[int]
    task_number_20: Mapped[int]
    task_number_21: Mapped[int]
    task_number_22: Mapped[int]
    task_number_23: Mapped[int]
    task_number_24: Mapped[int]
    task_number_25: Mapped[int]

class Russ(Sample):
    __tablename__ = 'russ'
    task_number_1: Mapped[int]
    task_number_2: Mapped[int]
    task_number_3: Mapped[int]
    task_number_4: Mapped[int]
    task_number_5: Mapped[int]
    task_number_6: Mapped[int]
    task_number_7: Mapped[int]
    task_number_8: Mapped[int]
    task_number_9: Mapped[int]
    task_number_10: Mapped[int]
    task_number_11: Mapped[int]
    task_number_12: Mapped[int]
    task_number_13: Mapped[int]
    task_number_14: Mapped[int]
    task_number_15: Mapped[int]
    task_number_16: Mapped[int]
    task_number_17: Mapped[int]
    task_number_18: Mapped[int]
    task_number_19: Mapped[int]
    task_number_20: Mapped[int]
    task_number_21: Mapped[int]
    task_number_22: Mapped[int]
    task_number_23: Mapped[int]
    task_number_24: Mapped[int]
    task_number_25: Mapped[int]
    task_number_26: Mapped[int]
    task_number_27: Mapped[int]

class English(Sample):
    __tablename__ = 'english'
    task_number_1: Mapped[int]
    task_number_2: Mapped[int]
    task_number_3: Mapped[int]
    task_number_4: Mapped[int]
    task_number_5: Mapped[int]
    task_number_6: Mapped[int]
    task_number_7: Mapped[int]
    task_number_8: Mapped[int]
    task_number_9: Mapped[int]
    task_number_10: Mapped[int]
    task_number_11: Mapped[int]
    task_number_12: Mapped[int]
    task_number_13: Mapped[int]
    task_number_14: Mapped[int]
    task_number_15: Mapped[int]
    task_number_16: Mapped[int]
    task_number_17: Mapped[int]
    task_number_18: Mapped[int]
    task_number_19: Mapped[int]
    task_number_20: Mapped[int]
    task_number_21: Mapped[int]
    task_number_22: Mapped[int]
    task_number_23: Mapped[int]
    task_number_24: Mapped[int]
    task_number_25: Mapped[int]
    task_number_26: Mapped[int]
    task_number_27: Mapped[int]
    task_number_28: Mapped[int]
    task_number_29: Mapped[int]
    task_number_30: Mapped[int]
    task_number_31: Mapped[int]
    task_number_32: Mapped[int]
    task_number_33: Mapped[int]
    task_number_34: Mapped[int]
    task_number_35: Mapped[int]
    task_number_36: Mapped[int]
    task_number_37: Mapped[int]
    task_number_38: Mapped[int]
    task_number_39: Mapped[int]
    task_number_40: Mapped[int]
    task_number_41: Mapped[int]
    task_number_42: Mapped[int]

def create_db_and_tables():
    Base.metadata.create_all(bind=engine)
