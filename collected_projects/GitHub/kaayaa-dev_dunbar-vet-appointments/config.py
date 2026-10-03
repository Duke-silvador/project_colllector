import os

from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-not-secret")
DATABASE_PATH = os.getenv("DATABASE_PATH", "clinic.db")
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"