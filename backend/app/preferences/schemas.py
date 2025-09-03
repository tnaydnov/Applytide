from pydantic import BaseModel
from typing import Any, Dict

class PreferenceCreate(BaseModel):
    preference_key: str
    preference_value: Dict[str, Any]

class PreferenceUpdate(BaseModel):
    preference_value: Dict[str, Any]

class PreferenceOut(BaseModel):
    preference_key: str
    preference_value: Dict[str, Any]
    
    class Config:
        from_attributes = True
