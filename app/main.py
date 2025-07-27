# app/main.py

# 1. Load .env into os.environ before anything else
from dotenv import load_dotenv
import uvicorn
# Ensure you have python-dotenv installed: pip install python-dotenv
load_dotenv()

import os
import logging
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.agents import router as agents_router

# ——— Logging setup —————————————————————————————————————————
# You can override LOG_FILE_PATH in your .env if you like.
log_path = os.getenv("LOG_FILE_PATH", "app.log")

handler = RotatingFileHandler(
    filename=log_path,
    maxBytes=5 * 1024 * 1024,   # rotate after 5 MB
    backupCount=3,              # keep last 3 files
    encoding="utf-8"
)
handler.setFormatter(logging.Formatter(
    "%(asctime)s %(levelname)s %(name)s: %(message)s"
))
root_logger = logging.getLogger()
root_logger.setLevel(logging.DEBUG)
root_logger.addHandler(handler)
# ——————————————————————————————————————————————————————————

app = FastAPI(title="Sahayak AskSahayak Feature")

# 2. CORS setup (origins from env or wildcard)
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Mount the agents router
app.include_router(agents_router, prefix="/api/agents", tags=["agents"])
app.include_router(agents_router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__== "__main__":
    port=int(os.environ.get("PORT", 8080))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port,)