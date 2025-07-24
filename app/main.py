# app/main.py

# 1. Load .env into os.environ before anything else
from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.agents import router as agents_router

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


@app.get("/health")
def health_check():
    return {"status": "ok"}
