from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func, join, or_
from ..db.session import get_db
from ..db import models
from ..auth.deps import get_current_user
from ..db.models import User
from pydantic import BaseModel

router = APIRouter(prefix="/api/kanban", tags=["kanban"])

# Pydantic models for request/response
class JobData(BaseModel):
    company: str
    title: str
    location: Optional[str] = None
    salary_range: Optional[str] = None
    description: Optional[str] = None

class ApplicationCreate(BaseModel):
    job: JobData
    status: str = "saved"
    priority: str = "medium"
    notes: Optional[str] = None
    deadline: Optional[str] = None

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    notes: Optional[str] = None
    deadline: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str

@router.get("/applications")
def get_applications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all applications for the current user"""
    try:
        # Query applications with job and company details
        stmt = select(models.Application).join(
            models.Job, models.Application.job_id == models.Job.id
        ).join(
            models.Company, models.Job.company_id == models.Company.id, isouter=True
        ).where(models.Application.user_id == current_user.id)
        
        applications = db.execute(stmt).scalars().all()
        
        applications_data = []
        for app in applications:
            # Get job and company info
            job = db.get(models.Job, app.job_id)
            company = db.get(models.Company, job.company_id) if job and job.company_id else None
            
            app_data = {
                'id': str(app.id),
                'status': app.status.lower().replace(' ', '-'),  # Convert to kanban format
                'priority': app.priority,  # Use actual priority field
                'notes': '',  # Default since not in current model
                'created_at': app.created_at.isoformat() if app.created_at else None,
                'updated_at': app.updated_at.isoformat() if app.updated_at else None,
                'deadline': None,  # Default since not in current model
                'job': {
                    'id': str(job.id) if job else None,
                    'title': job.title if job else None,
                    'company': company.name if company else 'Unknown Company',
                    'location': job.location if job else None,
                    'salary_range': job.salary_min and job.salary_max and f"${job.salary_min} - ${job.salary_max}" or None,
                    'description': job.description if job else None
                } if job else None
            }
            applications_data.append(app_data)
        
        return applications_data
        
    except Exception as e:
        print(f"Error getting applications: {e}")
        raise HTTPException(status_code=500, detail="Failed to get applications")

@router.post("/applications")
def create_application(
    payload: ApplicationCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Create a new application"""
    try:
        # Create or find company
        company = db.execute(
            select(models.Company).where(models.Company.name == payload.job.company)
        ).scalar_one_or_none()
        
        if not company:
            company = models.Company(
                id=uuid.uuid4(),
                name=payload.job.company,
                created_at=datetime.now(timezone.utc)
            )
            db.add(company)
            db.flush()  # Get the ID
        
        # Create job
        job = models.Job(
            id=uuid.uuid4(),
            company_id=company.id,
            title=payload.job.title,
            location=payload.job.location,
            description=payload.job.description,
            created_at=datetime.now(timezone.utc)
        )
        
        # Parse salary range if provided
        if payload.job.salary_range:
            try:
                # Simple parsing for ranges like "$100k - $150k" or "$100,000 - $150,000"
                salary_str = payload.job.salary_range.replace('$', '').replace(',', '').replace('k', '000')
                if ' - ' in salary_str:
                    min_sal, max_sal = salary_str.split(' - ')
                    job.salary_min = int(min_sal)
                    job.salary_max = int(max_sal)
            except:
                pass  # Skip if parsing fails
        
        db.add(job)
        db.flush()  # Get the ID
        
        # Check if application already exists for this user and job
        existing_app = db.execute(
            select(models.Application).where(
                models.Application.user_id == current_user.id,
                models.Application.job_id == job.id
            )
        ).scalar_one_or_none()
        
        if existing_app:
            # Update existing application instead of creating duplicate
            existing_app.status = payload.status.replace('-', ' ').title()
            existing_app.priority = payload.priority
            existing_app.updated_at = datetime.now(timezone.utc)
            db.commit()
            return {
                'id': str(existing_app.id),
                'message': 'Application updated successfully'
            }
        
        # Create application
        application = models.Application(
            id=uuid.uuid4(),
            user_id=current_user.id,
            job_id=job.id,
            status=payload.status.replace('-', ' ').title(),  # Convert from kanban format
            priority=payload.priority,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        db.add(application)
        db.commit()
        
        return {
            'id': str(application.id),
            'message': 'Application created successfully'
        }
        
    except Exception as e:
        db.rollback()
        print(f"Error creating application: {e}")
        raise HTTPException(status_code=500, detail="Failed to create application")

@router.put("/applications/{application_id}/status")
def update_application_status(
    application_id: str,
    payload: StatusUpdate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Update application status"""
    try:
        application = db.execute(
            select(models.Application).where(
                models.Application.id == uuid.UUID(application_id),
                models.Application.user_id == current_user.id
            )
        ).scalar_one_or_none()
        
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Convert from kanban format to database format
        new_status = payload.status.replace('-', ' ').title()
        application.status = new_status
        application.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        return {
            'message': 'Application status updated successfully',
            'status': application.status
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid application ID")
    except Exception as e:
        db.rollback()
        print(f"Error updating application status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update application status")

@router.put("/applications/{application_id}")
def update_application(
    application_id: str,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Update application details"""
    try:
        application = db.execute(
            select(models.Application).where(
                models.Application.id == uuid.UUID(application_id),
                models.Application.user_id == current_user.id
            )
        ).scalar_one_or_none()
        
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Update application fields
        if payload.status:
            application.status = payload.status.replace('-', ' ').title()
        if payload.priority:
            application.priority = payload.priority
        
        application.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        return {'message': 'Application updated successfully'}
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid application ID")
    except Exception as e:
        db.rollback()
        print(f"Error updating application: {e}")
        raise HTTPException(status_code=500, detail="Failed to update application")

@router.delete("/applications/{application_id}")
def delete_application(
    application_id: str,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Delete an application and all related records"""
    try:
        app_uuid = uuid.UUID(application_id)
        
        # Check if application exists and belongs to user
        application = db.execute(
            select(models.Application).where(
                models.Application.id == app_uuid,
                models.Application.user_id == current_user.id
            )
        ).scalar_one_or_none()
        
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Delete related records first to avoid foreign key constraints
        
        # 1. Delete notes
        db.execute(
            select(models.Note).where(models.Note.application_id == app_uuid)
        )
        db.execute(
            models.Note.__table__.delete().where(models.Note.application_id == app_uuid)
        )
        
        # 2. Delete stages  
        db.execute(
            models.Stage.__table__.delete().where(models.Stage.application_id == app_uuid)
        )
        
        # 3. Delete application attachments (if they exist)
        try:
            db.execute(
                models.ApplicationAttachment.__table__.delete().where(models.ApplicationAttachment.application_id == app_uuid)
            )
        except Exception:
            pass  # Table might not exist
        
        # 4. Finally delete the application
        db.delete(application)
        db.commit()
        
        return {'message': 'Application deleted successfully'}
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid application ID")
    except Exception as e:
        db.rollback()
        print(f"Error deleting application: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete application")

@router.get("/applications/stats")
def get_application_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get application statistics for dashboard"""
    try:
        applications = db.execute(
            select(models.Application).where(models.Application.user_id == current_user.id)
        ).scalars().all()
        
        stats = {
            'total': len(applications),
            'by_status': {},
            'by_priority': {},
            'recent_activity': []
        }
        
        # Count by status
        status_counts = {}
        
        for app in applications:
            # Status counts (convert to kanban format)
            status = app.status.lower().replace(' ', '-') if app.status else 'unknown'
            status_counts[status] = status_counts.get(status, 0) + 1
        
        stats['by_status'] = status_counts
        stats['by_priority'] = {'medium': len(applications)}  # Default since not in model
        
        # Recent activity (last 10 applications by updated_at)
        recent_apps = sorted(applications, key=lambda x: x.updated_at or x.created_at, reverse=True)[:10]
        for app in recent_apps:
            job = db.get(models.Job, app.job_id)
            company = db.get(models.Company, job.company_id) if job and job.company_id else None
            
            stats['recent_activity'].append({
                'id': str(app.id),
                'company': company.name if company else 'Unknown',
                'position': job.title if job else 'Unknown',
                'status': app.status.lower().replace(' ', '-') if app.status else 'unknown',
                'updated_at': (app.updated_at or app.created_at).isoformat()
            })
        
        return stats
        
    except Exception as e:
        print(f"Error getting application stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get application stats")
