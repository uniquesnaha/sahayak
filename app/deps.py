# app/deps.py

import os
from functools import lru_cache

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import firebase_admin
from firebase_admin import (
    auth as firebase_auth,
    credentials,
    firestore,
    storage as firebase_storage,
)

security_scheme = HTTPBearer(auto_error=False)

@lru_cache()
def init_firebase():
    """
    Initialize Firebase Admin SDK exactly once.
    Uses GOOGLE_APPLICATION_CREDENTIALS and (optionally) GCS_BUCKET.
    """
    if not firebase_admin._apps:
        # Prepare options for storage bucket
        opts = {}
        bucket_name = os.getenv("GCS_BUCKET")
        if bucket_name:
            opts["storageBucket"] = bucket_name

        # Initialize with service account if provided, else ADC
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        try:
            if cred_path:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred, options=opts)
            else:
                firebase_admin.initialize_app(options=opts)
        except ValueError:
            # "default app already exists" — ignore
            pass

    return True

def get_db():
    """
    Dependency to get a Firestore client.
    """
    init_firebase()
    return firestore.client()

def get_bucket():
    """
    Dependency to get a Cloud Storage bucket.
    Falls back to the Firebase‐configured default if GCS_BUCKET isn't set.
    """
    init_firebase()
    bucket_name = os.getenv("GCS_BUCKET")
    if bucket_name:
        return firebase_storage.bucket(bucket_name)
    # fallback to default bucket from app options
    try:
        return firebase_storage.bucket()
    except Exception:
        raise RuntimeError(
            "GCS_BUCKET environment variable is not set, "
            "and no default storage bucket was configured."
        )

async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security_scheme)
):
    """
    Dependency to verify Firebase ID token (or return a dev stub if none provided).
    """
    init_firebase()

    # DEV fallback
    if token is None:
        return {"uid": "dev-user", "email": "dev@example.com"}

    try:
        decoded = firebase_auth.verify_id_token(
            token.credentials, check_revoked=True
        )
        return decoded
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
