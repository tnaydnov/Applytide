from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)

# Use this consolidated version with remember_me field
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

# Remove LoginIn - use LoginRequest instead

# Use this consolidated version
class RefreshRequest(BaseModel):
    refresh_token: str

# Remove RefreshIn - use RefreshRequest instead

class EmailVerificationIn(BaseModel):
    email: EmailStr

class PasswordResetRequestIn(BaseModel):
    email: EmailStr

class PasswordResetIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

class VerifyEmailIn(BaseModel):
    token: str

# Use this consolidated version
class MessageResponse(BaseModel):
    message: str

# Remove MessageOut - use MessageResponse instead

class UserInfo(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    is_premium: bool = False
    premium_expires_at: Optional[str] = None
    created_at: str
    email_verified: bool = False

class TokenResponse(BaseModel):
    user: UserInfo
    expires_in: int = 900  # 15 minutes in seconds
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"

# Keep TokenPairOut for backward compatibility
class TokenPairOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"