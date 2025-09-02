from pydantic import BaseModel, EmailStr, Field

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)

class TokenPairOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class LoginIn(RegisterIn):
    pass

class RefreshIn(BaseModel):
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

class MessageOut(BaseModel):
    message: str
