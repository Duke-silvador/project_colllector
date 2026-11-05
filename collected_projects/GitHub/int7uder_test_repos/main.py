from contextlib import asynccontextmanager
from pydantic import BaseModel, Field
from pygments.styles import default
from sqlalchemy import select
from starlette.responses import FileResponse
from starlette.staticfiles import StaticFiles

from database import SessionLocal, create_db_and_tables, Society, Russ, English
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def home():
    return FileResponse("templates/index.html")

@app.get("/samples")
def get_samples():
    with SessionLocal() as session:
        society = session.scalars(select(Society)).all()
        russ = session.scalars(select(Russ)).all()
        english = session.scalars(select(English)).all()
        samples = society + russ + english
        samples.sort(key=lambda sample: sample.created_at, reverse=True)
        return samples

class SampleCreate(BaseModel):
    subject: str
    description: str|None = None
    runtime_hours: int = 0
    runtime_minutes: int = 0
    points: int = Field(ge=0, le=100)

class SocietyCreate(SampleCreate):
    task_number_1: int = Field(default=0, ge=0, le=1)
    task_number_2: int = Field(default=0, ge=0, le=2)
    task_number_3: int = Field(default=0, ge=0, le=1)
    task_number_4: int = Field(default=0, ge=0, le=2)
    task_number_5: int = Field(default=0, ge=0, le=2)
    task_number_6: int = Field(default=0, ge=0, le=2)
    task_number_7: int = Field(default=0, ge=0, le=2)
    task_number_8: int = Field(default=0, ge=0, le=2)
    task_number_9: int = Field(default=0, ge=0, le=1)
    task_number_10: int = Field(default=0, ge=0, le=2)
    task_number_11: int = Field(default=0, ge=0, le=2)
    task_number_12: int = Field(default=0, ge=0, le=1)
    task_number_13: int = Field(default=0, ge=0, le=2)
    task_number_14: int = Field(default=0, ge=0, le=2)
    task_number_15: int = Field(default=0, ge=0, le=2)
    task_number_16: int = Field(default=0, ge=0, le=2)
    task_number_17: int = Field(default=0, ge=0, le=2)
    task_number_18: int = Field(default=0, ge=0, le=2)
    task_number_19: int = Field(default=0, ge=0, le=3)
    task_number_20: int = Field(default=0, ge=0, le=3)
    task_number_21: int = Field(default=0, ge=0, le=3)
    task_number_22: int = Field(default=0, ge=0, le=4)
    task_number_23: int = Field(default=0, ge=0, le=3)
    task_number_24: int = Field(default=0, ge=0, le=4)
    task_number_25: int = Field(default=0, ge=0, le=6)

class RussCreate(SampleCreate):
    task_number_1: int = Field(default=0, ge=0, le=1)
    task_number_2: int = Field(default=0, ge=0, le=1)
    task_number_3: int = Field(default=0, ge=0, le=1)
    task_number_4: int = Field(default=0, ge=0, le=1)
    task_number_5: int = Field(default=0, ge=0, le=1)
    task_number_6: int = Field(default=0, ge=0, le=1)
    task_number_7: int = Field(default=0, ge=0, le=1)
    task_number_8: int = Field(default=0, ge=0, le=2)
    task_number_9: int = Field(default=0, ge=0, le=1)
    task_number_10: int = Field(default=0, ge=0, le=1)
    task_number_11: int = Field(default=0, ge=0, le=1)
    task_number_12: int = Field(default=0, ge=0, le=1)
    task_number_13: int = Field(default=0, ge=0, le=1)
    task_number_14: int = Field(default=0, ge=0, le=1)
    task_number_15: int = Field(default=0, ge=0, le=1)
    task_number_16: int = Field(default=0, ge=0, le=1)
    task_number_17: int = Field(default=0, ge=0, le=1)
    task_number_18: int = Field(default=0, ge=0, le=1)
    task_number_19: int = Field(default=0, ge=0, le=1)
    task_number_20: int = Field(default=0, ge=0, le=1)
    task_number_21: int = Field(default=0, ge=0, le=1)
    task_number_22: int = Field(default=0, ge=0, le=2)
    task_number_23: int = Field(default=0, ge=0, le=1)
    task_number_24: int = Field(default=0, ge=0, le=1)
    task_number_25: int = Field(default=0, ge=0, le=1)
    task_number_26: int = Field(default=0, ge=0, le=1)
    task_number_27: int = Field(default=0, ge=0, le=22)

class EnglishCreate(SampleCreate):
    task_number_1: int = Field(default=0, ge=0, le=2)
    task_number_2: int = Field(default=0, ge=0, le=3)
    task_number_3: int = Field(default=0, ge=0, le=1)
    task_number_4: int = Field(default=0, ge=0, le=1)
    task_number_5: int = Field(default=0, ge=0, le=1)
    task_number_6: int = Field(default=0, ge=0, le=1)
    task_number_7: int = Field(default=0, ge=0, le=1)
    task_number_8: int = Field(default=0, ge=0, le=1)
    task_number_9: int = Field(default=0, ge=0, le=1)
    task_number_10: int = Field(default=0, ge=0, le=3)
    task_number_11: int = Field(default=0, ge=0, le=2)
    task_number_12: int = Field(default=0, ge=0, le=1)
    task_number_13: int = Field(default=0, ge=0, le=1)
    task_number_14: int = Field(default=0, ge=0, le=1)
    task_number_15: int = Field(default=0, ge=0, le=1)
    task_number_16: int = Field(default=0, ge=0, le=1)
    task_number_17: int = Field(default=0, ge=0, le=1)
    task_number_18: int = Field(default=0, ge=0, le=1)
    task_number_19: int = Field(default=0, ge=0, le=1)
    task_number_20: int = Field(default=0, ge=0, le=1)
    task_number_21: int = Field(default=0, ge=0, le=1)
    task_number_22: int = Field(default=0, ge=0, le=1)
    task_number_23: int = Field(default=0, ge=0, le=1)
    task_number_24: int = Field(default=0, ge=0, le=1)
    task_number_25: int = Field(default=0, ge=0, le=1)
    task_number_26: int = Field(default=0, ge=0, le=1)
    task_number_27: int = Field(default=0, ge=0, le=1)
    task_number_28: int = Field(default=0, ge=0, le=1)
    task_number_29: int = Field(default=0, ge=0, le=1)
    task_number_30: int = Field(default=0, ge=0, le=1)
    task_number_31: int = Field(default=0, ge=0, le=1)
    task_number_32: int = Field(default=0, ge=0, le=1)
    task_number_33: int = Field(default=0, ge=0, le=1)
    task_number_34: int = Field(default=0, ge=0, le=1)
    task_number_35: int = Field(default=0, ge=0, le=1)
    task_number_36: int = Field(default=0, ge=0, le=1)
    task_number_37: int = Field(default=0, ge=0, le=6)
    task_number_38: int = Field(default=0, ge=0, le=14)
    task_number_39: int = Field(default=0, ge=0, le=1)
    task_number_40: int = Field(default=0, ge=0, le=1)
    task_number_41: int = Field(default=0, ge=0, le=1)
    task_number_42: int = Field(default=0, ge=0, le=10)

@app.post("/sample/society")
def create_sample_society(data:SocietyCreate):
    with SessionLocal() as session:
        num1 = data.task_number_1
        num2 = data.task_number_2
        num3 = data.task_number_3
        num4 = data.task_number_4
        num5 = data.task_number_5
        num6 = data.task_number_6
        num7 = data.task_number_7
        num8 = data.task_number_8
        num9 = data.task_number_9
        num10 = data.task_number_10
        num11 = data.task_number_11
        num12 = data.task_number_12
        num13 = data.task_number_13
        num14 = data.task_number_14
        num15 = data.task_number_15
        num16 = data.task_number_16
        num17 = data.task_number_17
        num18 = data.task_number_18
        num19 = data.task_number_19
        num20 = data.task_number_20
        num21 = data.task_number_21
        num22 = data.task_number_22
        num23 = data.task_number_23
        num24 = data.task_number_24
        num25 = data.task_number_25

        sample = Society(
            subject=data.subject,
            description=data.description,
            task_number_1=num1,
            task_number_2=num2,
            task_number_3=num3,
            task_number_4=num4,
            task_number_5=num5,
            task_number_6=num6,
            task_number_7=num7,
            task_number_8=num8,
            task_number_9=num9,
            task_number_10=num10,
            task_number_11=num11,
            task_number_12=num12,
            task_number_13=num13,
            task_number_14=num14,
            task_number_15=num15,
            task_number_16=num16,
            task_number_17=num17,
            task_number_18=num18,
            task_number_19=num19,
            task_number_20=num20,
            task_number_21=num21,
            task_number_22=num22,
            task_number_23=num23,
            task_number_24=num24,
            task_number_25=num25,
            runtime=data.runtime_hours * 3600 + data.runtime_minutes * 60,
            points = data.points,
        )
        session.add(sample)
        session.commit()
        return {
            "message": "Sample created"
                }

@app.delete("/sample/society/{sample_id}")
def delete_sample_society(sample_id: str):
    with SessionLocal() as session:
        sample = session.query(Society).filter(Society.id == sample_id).first()
        session.delete(sample)
        session.commit()

@app.post("/sample/russ")
def create_sample_russ(data:RussCreate):
    with SessionLocal() as session:
        num1 = data.task_number_1
        num2 = data.task_number_2
        num3 = data.task_number_3
        num4 = data.task_number_4
        num5 = data.task_number_5
        num6 = data.task_number_6
        num7 = data.task_number_7
        num8 = data.task_number_8
        num9 = data.task_number_9
        num10 = data.task_number_10
        num11 = data.task_number_11
        num12 = data.task_number_12
        num13 = data.task_number_13
        num14 = data.task_number_14
        num15 = data.task_number_15
        num16 = data.task_number_16
        num17 = data.task_number_17
        num18 = data.task_number_18
        num19 = data.task_number_19
        num20 = data.task_number_20
        num21 = data.task_number_21
        num22 = data.task_number_22
        num23 = data.task_number_23
        num24 = data.task_number_24
        num25 = data.task_number_25
        num26 = data.task_number_26
        num27 = data.task_number_27

        sample = Russ(
            subject=data.subject,
            description=data.description,
            task_number_1=num1,
            task_number_2=num2,
            task_number_3=num3,
            task_number_4=num4,
            task_number_5=num5,
            task_number_6=num6,
            task_number_7=num7,
            task_number_8=num8,
            task_number_9=num9,
            task_number_10=num10,
            task_number_11=num11,
            task_number_12=num12,
            task_number_13=num13,
            task_number_14=num14,
            task_number_15=num15,
            task_number_16=num16,
            task_number_17=num17,
            task_number_18=num18,
            task_number_19=num19,
            task_number_20=num20,
            task_number_21=num21,
            task_number_22=num22,
            task_number_23=num23,
            task_number_24=num24,
            task_number_25=num25,
            task_number_26=num26,
            task_number_27=num27,
            runtime=data.runtime_hours * 3600 + data.runtime_minutes * 60,
            points=data.points,
        )
        session.add(sample)
        session.commit()
        return {
            "message": "Sample created"
                }

@app.delete("/sample/russ/{sample_id}")
def delete_sample_russ(sample_id: str):
    with SessionLocal() as session:
        sample = session.query(Russ).filter(Russ.id == sample_id).first()
        session.delete(sample)
        session.commit()

@app.post("/sample/english")
def create_sample_english(data:EnglishCreate):
    with SessionLocal() as session:
        num1 = data.task_number_1
        num2 = data.task_number_2
        num3 = data.task_number_3
        num4 = data.task_number_4
        num5 = data.task_number_5
        num6 = data.task_number_6
        num7 = data.task_number_7
        num8 = data.task_number_8
        num9 = data.task_number_9
        num10 = data.task_number_10
        num11 = data.task_number_11
        num12 = data.task_number_12
        num13 = data.task_number_13
        num14 = data.task_number_14
        num15 = data.task_number_15
        num16 = data.task_number_16
        num17 = data.task_number_17
        num18 = data.task_number_18
        num19 = data.task_number_19
        num20 = data.task_number_20
        num21 = data.task_number_21
        num22 = data.task_number_22
        num23 = data.task_number_23
        num24 = data.task_number_24
        num25 = data.task_number_25
        num26 = data.task_number_26
        num27 = data.task_number_27
        num28 = data.task_number_28
        num29 = data.task_number_29
        num30 = data.task_number_30
        num31 = data.task_number_31
        num32 = data.task_number_32
        num33 = data.task_number_33
        num34 = data.task_number_34
        num35 = data.task_number_35
        num36 = data.task_number_36
        num37 = data.task_number_37
        num38 = data.task_number_38
        num39 = data.task_number_39
        num40 = data.task_number_40
        num41 = data.task_number_41
        num42 = data.task_number_42

        sample = English(
            subject=data.subject,
            description=data.description,
            task_number_1=num1,
            task_number_2=num2,
            task_number_3=num3,
            task_number_4=num4,
            task_number_5=num5,
            task_number_6=num6,
            task_number_7=num7,
            task_number_8=num8,
            task_number_9=num9,
            task_number_10=num10,
            task_number_11=num11,
            task_number_12=num12,
            task_number_13=num13,
            task_number_14=num14,
            task_number_15=num15,
            task_number_16=num16,
            task_number_17=num17,
            task_number_18=num18,
            task_number_19=num19,
            task_number_20=num20,
            task_number_21=num21,
            task_number_22=num22,
            task_number_23=num23,
            task_number_24=num24,
            task_number_25=num25,
            task_number_26=num26,
            task_number_27=num27,
            task_number_28=num28,
            task_number_29=num29,
            task_number_30=num30,
            task_number_31=num31,
            task_number_32=num32,
            task_number_33=num33,
            task_number_34=num34,
            task_number_35=num35,
            task_number_36=num36,
            task_number_37=num37,
            task_number_38=num38,
            task_number_39=num39,
            task_number_40=num40,
            task_number_41=num41,
            task_number_42=num42,
            runtime=data.runtime_hours * 3600 + data.runtime_minutes * 60,
            points=data.points,
        )
        session.add(sample)
        session.commit()
        return {
            "message": "Sample created"
                }

@app.delete("/sample/english/{sample_id}")
def delete_sample_english(sample_id: str):
    with SessionLocal() as session:
        sample = session.query(English).filter(English.id == sample_id).first()
        session.delete(sample)
        session.commit()
