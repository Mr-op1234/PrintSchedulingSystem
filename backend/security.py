"""
Security Module - Authentication, Authorization, and Input Validation

This module provides:
1. JWT token-based authentication for API endpoints
2. Input sanitization to prevent XSS and injection attacks
3. Session management with secure tokens
4. Password hashing for xerox staff authentication
"""

import re
import os
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Tuple
from functools import wraps

# JWT for token-based auth
import jwt
from fastapi import HTTPException, Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# =============================================================================
# CONFIGURATION - Update these in production!
# =============================================================================

# Secret key for JWT signing - CHANGE THIS IN PRODUCTION!
# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-key-change-in-production-abc123xyz789")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Xerox staff credentials - CHANGE THIS IN PRODUCTION!
# Password is hashed using SHA-256 (in production, use bcrypt)
# Default password: "xerox@iem2025" -> hash it
XEROX_STAFF_USERNAME = "xerox_admin"
XEROX_STAFF_PASSWORD_HASH = hashlib.sha256("xerox@iem2025".encode()).hexdigest()

# =============================================================================
# INPUT SANITIZATION
# =============================================================================

def sanitize_string(value: str, max_length: int = 500, allow_newlines: bool = False) -> str:
    """
    Sanitize string input to prevent XSS and injection attacks.
    
    - Strips leading/trailing whitespace
    - Removes null bytes
    - Escapes HTML special characters
    - Limits length
    - Optionally removes newlines
    """
    if not value:
        return ""
    
    # Remove null bytes
    value = value.replace('\x00', '')
    
    # Strip whitespace
    value = value.strip()
    
    # Limit length
    value = value[:max_length]
    
    # Remove newlines if not allowed
    if not allow_newlines:
        value = value.replace('\n', ' ').replace('\r', ' ')
    
    # Escape HTML special characters (prevents XSS)
    html_escapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
    }
    for char, escape in html_escapes.items():
        value = value.replace(char, escape)
    
    return value


def validate_student_id(student_id: str) -> Tuple[bool, str]:
    """
    Validate student ID format.
    Expected format: numeric, 11-14 digits (e.g., 12023052016044)
    """
    # Remove whitespace
    student_id = student_id.strip()
    
    # Check if it's alphanumeric (some colleges use letters)
    if not re.match(r'^[A-Za-z0-9]{8,20}$', student_id):
        return False, "Student ID must be 8-20 alphanumeric characters"
    
    return True, student_id


def validate_student_name(name: str) -> Tuple[bool, str]:
    """
    Validate student name.
    - Only letters, spaces, and common name characters
    - 2-100 characters
    """
    name = name.strip()
    
    if len(name) < 2:
        return False, "Name must be at least 2 characters"
    
    if len(name) > 100:
        return False, "Name must be less than 100 characters"
    
    # Allow letters, spaces, hyphens, apostrophes, dots
    if not re.match(r"^[A-Za-z\s\-'.]+$", name):
        return False, "Name contains invalid characters"
    
    return True, sanitize_string(name, max_length=100)


def validate_transaction_id(txn_id: str) -> Tuple[bool, str]:
    """
    Validate transaction ID format.
    - Alphanumeric
    - 8-30 characters
    """
    txn_id = txn_id.strip()
    
    if not txn_id:
        return False, "Transaction ID is required"
    
    if not re.match(r'^[A-Za-z0-9]{8,30}$', txn_id):
        return False, "Invalid transaction ID format"
    
    return True, txn_id


def validate_color_mode(mode: str) -> Tuple[bool, str]:
    """Validate color mode is one of allowed values"""
    if mode not in ['bw', 'color']:
        return False, "Color mode must be 'bw' or 'color'"
    return True, mode


def validate_paper_type(paper_type: str) -> Tuple[bool, str]:
    """Validate paper type is one of allowed values"""
    if paper_type not in ['normal', 'photopaper']:
        return False, "Paper type must be 'normal' or 'photopaper'"
    return True, paper_type


def validate_binding(binding: str) -> Tuple[bool, str]:
    """Validate binding is one of allowed values"""
    if binding not in ['none', 'spiral', 'soft']:
        return False, "Binding must be 'none', 'spiral', or 'soft'"
    return True, binding


def validate_print_sides(sides: str) -> Tuple[bool, str]:
    """Validate print sides is one of allowed values"""
    if sides not in ['single', 'double']:
        return False, "Print sides must be 'single' or 'double'"
    return True, sides


def validate_copies(copies: int) -> Tuple[bool, int]:
    """Validate copies is within allowed range"""
    if copies < 1 or copies > 10:
        return False, "Copies must be between 1 and 10"
    return True, copies


# =============================================================================
# JWT AUTHENTICATION
# =============================================================================

security_scheme = HTTPBearer(auto_error=False)


def create_access_token(username: str, role: str = "staff") -> str:
    """
    Create a JWT access token for authenticated users.
    """
    payload = {
        "sub": username,
        "role": role,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    """
    Verify and decode a JWT token.
    Returns the payload if valid, None otherwise.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def verify_xerox_credentials(username: str, password: str) -> bool:
    """
    Verify xerox staff login credentials.
    """
    if username != XEROX_STAFF_USERNAME:
        return False
    
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    return secrets.compare_digest(password_hash, XEROX_STAFF_PASSWORD_HASH)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> Optional[dict]:
    """
    FastAPI dependency to get the current authenticated user.
    Returns None if not authenticated.
    """
    if not credentials:
        return None
    
    payload = verify_token(credentials.credentials)
    return payload


async def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> dict:
    """
    FastAPI dependency that requires authentication.
    Raises 401 if not authenticated.
    """
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return payload


async def require_xerox_staff(
    user: dict = Depends(require_auth)
) -> dict:
    """
    FastAPI dependency that requires xerox staff role.
    """
    if user.get("role") != "staff":
        raise HTTPException(
            status_code=403,
            detail="Xerox staff access required"
        )
    return user


# =============================================================================
# RATE LIMITING (Simple in-memory implementation)
# =============================================================================

# Store request counts: {ip: [(timestamp, count), ...]}
_rate_limit_store: dict = {}
RATE_LIMIT_REQUESTS = 100  # Max requests
RATE_LIMIT_WINDOW = 60  # Per minute


def check_rate_limit(client_ip: str) -> bool:
    """
    Check if client has exceeded rate limit.
    Returns True if allowed, False if rate limited.
    """
    now = datetime.utcnow()
    window_start = now - timedelta(seconds=RATE_LIMIT_WINDOW)
    
    # Clean old entries
    if client_ip in _rate_limit_store:
        _rate_limit_store[client_ip] = [
            (ts, count) for ts, count in _rate_limit_store[client_ip]
            if ts > window_start
        ]
    
    # Count requests in window
    requests_in_window = sum(
        count for ts, count in _rate_limit_store.get(client_ip, [])
    )
    
    if requests_in_window >= RATE_LIMIT_REQUESTS:
        return False
    
    # Add current request
    if client_ip not in _rate_limit_store:
        _rate_limit_store[client_ip] = []
    _rate_limit_store[client_ip].append((now, 1))
    
    return True


async def rate_limit_check(request: Request):
    """
    FastAPI dependency for rate limiting.
    """
    client_ip = request.client.host if request.client else "unknown"
    
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later."
        )
