# backend/app/domain/admin/applications_repository.py
"""Repository for admin application management queries"""
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select, delete, update, desc, asc, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Application, User, Job, Resume, Company
from .applications_dto import ApplicationSummaryDTO, ApplicationDetailDTO, ApplicationAnalyticsDTO


class ApplicationsAdminRepository:
    """Handles database operations for admin application management"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def list_applications(
        self,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        status: Optional[str] = None,
        source: Optional[str] = None,
        user_id: Optional[UUID] = None,
        job_id: Optional[UUID] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> tuple[list[ApplicationSummaryDTO], int]:
        """List applications with pagination and filters"""
        
        # Build base query
        query = select(
            Application,
            User.email.label("user_email"),
            Job.title.label("job_title"),
            Company.name.label("company_name")
        ).outerjoin(
            User, User.id == Application.user_id
        ).outerjoin(
            Job, Job.id == Application.job_id
        ).outerjoin(
            Company, Company.id == Job.company_id
        )
        
        # Apply filters
        conditions = []
        
        if search:
            search_pattern = f"%{search}%"
            conditions.append(
                or_(
                    User.email.ilike(search_pattern),
                    Job.title.ilike(search_pattern),
                    Company.name.ilike(search_pattern)
                )
            )
        
        if status:
            conditions.append(Application.status == status)
        
        if source:
            conditions.append(Application.source == source)
        
        if user_id:
            conditions.append(Application.user_id == user_id)
        
        if job_id:
            conditions.append(Application.job_id == job_id)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Count total before pagination
        count_query = select(func.count()).select_from(
            query.subquery()
        )
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        
        # Apply sorting
        sort_column = getattr(Application, sort_by, Application.created_at)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        rows = result.all()
        
        # Convert to DTOs
        applications = []
        for row in rows:
            app, user_email, job_title, company_name = row
            applications.append(ApplicationSummaryDTO(
                id=app.id,
                user_id=app.user_id,
                job_id=app.job_id,
                resume_id=app.resume_id,
                status=app.status,
                source=app.source,
                created_at=app.created_at,
                user_email=user_email,
                job_title=job_title,
                company_name=company_name
            ))
        
        return applications, total
    
    async def get_application_detail(self, app_id: UUID) -> Optional[ApplicationDetailDTO]:
        """Get detailed application information"""
        query = select(
            Application,
            User.email.label("user_email"),
            User.full_name.label("user_name"),
            Job.title.label("job_title"),
            Job.location.label("job_location"),
            Company.name.label("company_name"),
            Resume.label.label("resume_label")
        ).outerjoin(
            User, User.id == Application.user_id
        ).outerjoin(
            Job, Job.id == Application.job_id
        ).outerjoin(
            Company, Company.id == Job.company_id
        ).outerjoin(
            Resume, Resume.id == Application.resume_id
        ).where(
            Application.id == app_id
        )
        
        result = await self.db.execute(query)
        row = result.first()
        
        if not row:
            return None
        
        app, user_email, user_name, job_title, job_location, company_name, resume_label = row
        
        return ApplicationDetailDTO(
            id=app.id,
            user_id=app.user_id,
            job_id=app.job_id,
            resume_id=app.resume_id,
            status=app.status,
            source=app.source,
            created_at=app.created_at,
            user_email=user_email,
            user_name=user_name,
            job_title=job_title,
            job_location=job_location,
            company_name=company_name,
            resume_label=resume_label
        )
    
    async def update_application_status(
        self,
        app_id: UUID,
        status: str
    ) -> bool:
        """Update application status"""
        query = update(Application).where(
            Application.id == app_id
        ).values(status=status)
        
        result = await self.db.execute(query)
        await self.db.commit()
        
        return result.rowcount > 0
    
    async def delete_application(self, app_id: UUID) -> bool:
        """Delete an application"""
        result = await self.db.execute(
            delete(Application).where(Application.id == app_id)
        )
        await self.db.commit()
        
        return result.rowcount > 0
    
    async def bulk_delete_applications(self, app_ids: list[UUID]) -> int:
        """Delete multiple applications"""
        result = await self.db.execute(
            delete(Application).where(Application.id.in_(app_ids))
        )
        await self.db.commit()
        
        return result.rowcount
    
    async def get_application_analytics(self) -> ApplicationAnalyticsDTO:
        """Get application analytics"""
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)
        
        # Total applications
        total_result = await self.db.execute(
            select(func.count(Application.id))
        )
        total_applications = total_result.scalar() or 0
        
        # Applications in last 7 days
        apps_7d_result = await self.db.execute(
            select(func.count(Application.id)).where(
                Application.created_at >= seven_days_ago
            )
        )
        apps_7d = apps_7d_result.scalar() or 0
        
        # Applications in last 30 days
        apps_30d_result = await self.db.execute(
            select(func.count(Application.id)).where(
                Application.created_at >= thirty_days_ago
            )
        )
        apps_30d = apps_30d_result.scalar() or 0
        
        # By status
        by_status_result = await self.db.execute(
            select(
                Application.status,
                func.count(Application.id).label("count")
            )
            .group_by(Application.status)
            .order_by(desc("count"))
        )
        by_status = [
            {"status": row[0], "count": row[1]}
            for row in by_status_result.all()
        ]
        
        # By source
        by_source_result = await self.db.execute(
            select(
                Application.source,
                func.count(Application.id).label("count")
            )
            .where(Application.source.isnot(None))
            .group_by(Application.source)
            .order_by(desc("count"))
        )
        by_source = [
            {"source": row[0], "count": row[1]}
            for row in by_source_result.all()
        ]
        
        # Conversion funnel (status progression)
        from app.db.models import PIPELINE_STATUSES
        conversion_funnel = []
        total_apps = total_applications
        
        for status in PIPELINE_STATUSES:
            count_result = await self.db.execute(
                select(func.count(Application.id)).where(
                    Application.status == status
                )
            )
            count = count_result.scalar() or 0
            conversion_rate = (count / total_apps) if total_apps > 0 else 0
            
            conversion_funnel.append({
                "stage": status,
                "count": count,
                "conversion_rate": conversion_rate
            })
        
        # Applications by date (last 30 days)
        apps_by_date_result = await self.db.execute(
            select(
                func.date(Application.created_at).label("date"),
                func.count(Application.id).label("count")
            )
            .where(Application.created_at >= thirty_days_ago)
            .group_by(func.date(Application.created_at))
            .order_by(asc("date"))
        )
        apps_by_date = [
            {"date": row[0].isoformat(), "count": row[1]}
            for row in apps_by_date_result.all()
        ]
        
        return ApplicationAnalyticsDTO(
            total_applications=total_applications,
            apps_7d=apps_7d,
            apps_30d=apps_30d,
            by_status=by_status,
            by_source=by_source,
            conversion_funnel=conversion_funnel,
            apps_by_date=apps_by_date
        )
