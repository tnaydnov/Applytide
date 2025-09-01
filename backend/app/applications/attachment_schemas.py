from pydantic import BaseModel
import uuid
from datetime import datetime


class AttachmentOut(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    filename: str
    file_size: int
    content_type: str
    file_path: str
    created_at: datetime

    class Config:
        from_attributes = True


class AttachmentUpload(BaseModel):
    filename: str
    content_type: str
