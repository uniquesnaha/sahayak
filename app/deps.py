# app/deps.py

import os
from functools import lru_cache

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

security_scheme = HTTPBearer(auto_error=False)

@lru_cache()
def init_firebase():
    if not firebase_admin._apps:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if cred_path:
            # Use service-account JSON if provided
            firebase_admin.initialize_app(credentials.Certificate(cred_path))
        else:
            # DEV FALLBACK: use Application Default Credentials
            firebase_admin.initialize_app()
    return True

async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security_scheme)
):
    init_firebase()

    # ─── DEV ONLY: skip auth if no token supplied ───────────────
    if token is None:
        # Return a dummy user object so downstream code can use user["uid"]
        return {"uid": "dev-user", "email": "dev@example.com"}

    # In production, you’d verify the bearer token:
    try:
        decoded = firebase_auth.verify_id_token(token.credentials, check_revoked=True)
        return decoded
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
