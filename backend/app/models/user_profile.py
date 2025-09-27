"""
User Profile Models for AI Personalization
Stores user preferences, location, target roles, and career goals
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from ..db.base import Base
import uuid
from datetime import datetime

class UserProfile(Base):
    """Simplified user profile for AI personalization"""
    __tablename__ = "user_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    
    # Geographic Preferences
    preferred_locations = Column(JSON)  # ["San Francisco, CA", "Remote", "New York, NY"]
    country = Column(String)            # "United States"
    remote_preference = Column(String)  # "remote_only", "hybrid", "onsite", "any"
    
    # Career Preferences  
    target_roles = Column(JSON)         # ["Senior Frontend Engineer", "Full Stack Developer"]
    target_industries = Column(JSON)    # ["Technology", "Fintech", "Healthcare"]
    experience_level = Column(String)   # "entry", "mid", "senior", "lead", "executive"
    

    
    # Skills and Career Goals
    skills = Column(JSON)               # ["JavaScript", "React", "Python", "AWS"]
    career_goals = Column(JSON)         # ["Learn TypeScript", "Get promoted", "Join a startup"]
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Note: Relationship with User model removed to avoid mapping conflicts
