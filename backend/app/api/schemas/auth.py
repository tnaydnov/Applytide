from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, max_length=20)
    timezone: Optional[str] = Field(None, max_length=50)
    language: Optional[str] = Field("en", max_length=10)
    
    # Legal Agreements (Required)
    terms_accepted: bool = Field(..., description="User must accept Terms of Service")
    privacy_accepted: bool = Field(..., description="User must accept Privacy Policy")
    age_verified: bool = Field(..., description="User must confirm they are 13+ years old")
    data_processing_consent: bool = Field(..., description="User must consent to data processing (GDPR/CCPA)")

class GoogleOAuthRegisterIn(BaseModel):
    """Schema for Google OAuth registration with legal agreements"""
    google_id: str
    email: EmailStr
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    
    # Legal Agreements (Required even for OAuth)
    terms_accepted: bool = Field(..., description="User must accept Terms of Service")
    privacy_accepted: bool = Field(..., description="User must accept Privacy Policy")
    age_verified: bool = Field(..., description="User must confirm they are 13+ years old")
    data_processing_consent: bool = Field(..., description="User must consent to data processing (GDPR/CCPA)")

class AccountDeletionRequestIn(BaseModel):
    """Request to delete user account (7-day recovery period)"""
    password: Optional[str] = Field(None, description="Required for non-OAuth users")
    confirmation: str = Field(..., description="Must type 'DELETE' to confirm")

class AccountRecoveryIn(BaseModel):
    """Recover a deleted account within 7-day grace period"""
    recovery_token: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class RefreshRequest(BaseModel):
    refresh_token: str

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

class MessageResponse(BaseModel):
    message: str

class ExtensionTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserInfo(BaseModel):
    id: str
    email: str
    role: str = "user"
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
    expires_in: int = 900
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"

class TokenPairOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

User = UserInfo  # alias/back-compat
