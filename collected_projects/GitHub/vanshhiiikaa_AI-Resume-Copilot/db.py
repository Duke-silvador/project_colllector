import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
CA_PATH = os.getenv("TIDB_CA_PATH")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True, 
    connect_args={
        "ssl": {
            "ca": CA_PATH,
            "check_hostname": True,
        }
    }
)

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()