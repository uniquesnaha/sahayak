# app/routers/resources.py

import uuid
from typing import List

from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse

from firebase_admin import firestore
from google.cloud import storage as gcs

from app.deps import get_db, get_bucket, get_current_user

router = APIRouter()

