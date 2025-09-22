from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, max_length=20)
    timezone: Optional[str] = Field(None, max_length=50)
    language: Optional[str] = Field("en", max_length=10)
    client_id: str | None = None

# Use this consolidated version with remember_me field
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False
    client_id: str | None = None

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

class ProfileUpdateIn(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=100)
    timezone: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, max_length=200)
    linkedin_url: Optional[str] = Field(None, max_length=200)
    github_url: Optional[str] = Field(None, max_length=200)

class PreferencesUpdateIn(BaseModel):
    language: Optional[str] = Field(None, max_length=10)
    theme_preference: Optional[str] = Field(None, max_length=20)
    notification_email: Optional[bool] = None
    notification_push: Optional[bool] = None

class PasswordChangeIn(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

# Use this consolidated version
class MessageResponse(BaseModel):
    message: str

class ExtensionTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserInfo(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    timezone: Optional[str] = None
    website: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    language: str = "en"
    theme_preference: str = "dark"
    notification_email: bool = True
    notification_push: bool = True
    is_premium: bool = False
    premium_expires_at: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    last_login_at: Optional[str] = None
    email_verified: bool = False
    is_oauth_user: bool = False
    google_id: Optional[str] = None

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

User = UserInfo  # Alias for backward compatibility