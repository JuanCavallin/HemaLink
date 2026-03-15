import os
import requests as http_requests
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL")

_jwks_cache: dict | None = None

def _get_jwks() -> dict:
    global _jwks_cache
    if not _jwks_cache:
        resp = http_requests.get(CLERK_JWKS_URL, timeout=5)
        resp.raise_for_status()
        _jwks_cache = resp.json()
    return _jwks_cache

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> str:
    """
    Verifies the Clerk JWT from the Authorization header.
    Returns the Clerk user ID (the `sub` claim).
    Raises HTTP 401 if the token is missing, expired, or invalid.
    """
    token = credentials.credentials
    jwks = _get_jwks()
    try:
        header = jwt.get_unverified_header(token)
        key = next(
            (k for k in jwks["keys"] if k.get("kid") == header.get("kid")),
            None,
        )
        if key is None:
            raise ValueError("Matching key not found in JWKS")
        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk JWTs may omit aud
        )
        return payload["sub"]
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {exc}")
