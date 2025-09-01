from __future__ import annotations
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, or_, desc, case
from ..db.session import get_db
from ..db import models
from ..auth.deps import get_current_user
from ..db.models import User
import tempfile
import csv
import json

router = APIRouter(prefix="/analytics", tags=["analytics"])

def get_time_range_filter(range_param: str):
    """Convert range parameter to datetime filter"""
    now = datetime.now(timezone.utc)
    
    if range_param == '1m':
        start_date = now - timedelta(days=30)
    elif range_param == '3m':
        start_date = now - timedelta(days=90)
    elif range_param == '6m':
        start_date = now - timedelta(days=180)
    elif range_param == '1y':
        start_date = now - timedelta(days=365)
    elif range_param == 'all':
        start_date = datetime(2020, 1, 1, tzinfo=timezone.utc)  # Far enough back
    else:
        start_date = now - timedelta(days=180)  # Default to 6 months
    
    return start_date

@router.get("")
def get_analytics(
    range_param: str = Query('6m', alias='range'),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive analytics data for the user"""
    
    start_date = get_time_range_filter(range_param)
    
    # Get all user applications within time range
    applications = db.query(models.Application).filter(
        models.Application.user_id == current_user.id,
        models.Application.created_at >= start_date
    ).all()
    
    app_ids = [app.id for app in applications]
    
    # Get all stages for these applications
    stages = []
    if app_ids:
        stages = db.query(models.Stage).filter(
            models.Stage.application_id.in_(app_ids)
        ).all()
    
    # Calculate overview metrics
    overview_data = calculate_overview_metrics(applications, stages, start_date, db)
    
    # Calculate different metric sections
    analytics_data = {
        "overview": overview_data,
        "applications": calculate_application_metrics(applications, db),
        "interviews": calculate_interview_metrics(stages, applications),
        "companies": calculate_company_metrics(applications, db),
        "timeline": calculate_timeline_metrics(applications, stages),
        "salary": calculate_salary_metrics(applications, db)
    }
    
    return analytics_data

def calculate_overview_metrics(applications: List[models.Application], stages: List[models.Stage], start_date: datetime, db: Session) -> Dict[str, Any]:
    """Calculate overview/summary metrics"""
    
    total_applications = len(applications)
    
    # Calculate interview rate (applications that have interview stages)
    interview_stages = [s for s in stages if 'interview' in s.name.lower() or 'phone screen' in s.name.lower()]
    unique_apps_with_interviews = len(set(s.application_id for s in interview_stages))
    interview_rate = (unique_apps_with_interviews / total_applications * 100) if total_applications > 0 else 0
    
    # Calculate offer rate
    offer_stages = [s for s in stages if 'offer' in s.name.lower() or s.outcome == 'offer']
    apps_with_offers = len(set(s.application_id for s in offer_stages))
    offer_rate = (apps_with_offers / total_applications * 100) if total_applications > 0 else 0
    
    # Calculate average response time (time from application to first response)
    response_times = []
    for app in applications:
        app_stages = [s for s in stages if s.application_id == app.id]
        if app_stages:
            first_stage = min(app_stages, key=lambda x: x.created_at)
            response_time = (first_stage.created_at - app.created_at).days
            response_times.append(response_time)
    
    avg_response_time = sum(response_times) / len(response_times) if response_times else 0
    
    # Status distribution
    status_counts = {}
    for app in applications:
        status_counts[app.status] = status_counts.get(app.status, 0) + 1
    
    status_distribution = [
        {"label": status, "value": count} 
        for status, count in status_counts.items()
    ]
    
    # Applications over time (last 12 weeks)
    applications_over_time = []
    for i in range(12):
        week_start = start_date + timedelta(weeks=i)
        week_end = week_start + timedelta(weeks=1)
        week_apps = [app for app in applications if week_start <= app.created_at < week_end]
        applications_over_time.append({
            "date": week_start.strftime("%Y-%m-%d"),
            "count": len(week_apps)
        })
    
    # Application funnel
    funnel_stages = [
        {"name": "Applied", "count": total_applications},
        {"name": "Phone Screen", "count": len([s for s in stages if 'phone' in s.name.lower()])},
        {"name": "Technical", "count": len([s for s in stages if 'technical' in s.name.lower() or 'tech' in s.name.lower()])},
        {"name": "On-site", "count": len([s for s in stages if 'on-site' in s.name.lower() or 'onsite' in s.name.lower()])},
        {"name": "Offer", "count": apps_with_offers}
    ]
    
    return {
        "totalApplications": total_applications,
        "applicationsChange": 0,  # TODO: Calculate vs previous period
        "interviewRate": round(interview_rate, 1),
        "interviewRateChange": 0,  # TODO: Calculate vs previous period
        "offerRate": round(offer_rate, 1),
        "offerRateChange": 0,  # TODO: Calculate vs previous period
        "avgResponseTime": round(avg_response_time, 1),
        "responseTimeChange": 0,  # TODO: Calculate vs previous period
        "statusDistribution": status_distribution,
        "applicationsOverTime": applications_over_time,
        "funnel": funnel_stages
    }

def calculate_application_metrics(applications: List[models.Application], db: Session) -> Dict[str, Any]:
    """Calculate application-specific metrics"""
    
    # Status breakdown
    status_counts = {}
    for app in applications:
        status_counts[app.status] = status_counts.get(app.status, 0) + 1
    
    status_breakdown = [
        {"status": status, "count": count, "percentage": round((count / len(applications)) * 100, 1)}
        for status, count in status_counts.items()
    ] if applications else []
    
    # Applications by month
    monthly_data = {}
    for app in applications:
        month_key = app.created_at.strftime("%Y-%m")
        monthly_data[month_key] = monthly_data.get(month_key, 0) + 1
    
    applications_by_month = [
        {"month": month, "count": count}
        for month, count in sorted(monthly_data.items())
    ]
    
    # Get job titles and companies
    job_titles = []
    companies = []
    for app in applications:
        job = db.query(models.Job).filter(models.Job.id == app.job_id).first()
        if job:
            job_titles.append(job.title)
            if job.company_id:
                company = db.query(models.Company).filter(models.Company.id == job.company_id).first()
                if company:
                    companies.append(company.name)
    
    # Top job titles
    title_counts = {}
    for title in job_titles:
        title_counts[title] = title_counts.get(title, 0) + 1
    
    top_job_titles = [
        {"title": title, "count": count}
        for title, count in sorted(title_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]
    
    return {
        "totalApplications": len(applications),
        "statusBreakdown": status_breakdown,
        "applicationsByMonth": applications_by_month,
        "topJobTitles": top_job_titles,
        "uniqueCompanies": len(set(companies))
    }

def calculate_interview_metrics(stages: List[models.Stage], applications: List[models.Application]) -> Dict[str, Any]:
    """Calculate interview-specific metrics"""
    interview_stages = [s for s in stages if any(keyword in s.name.lower() for keyword in ['interview', 'phone screen', 'tech', 'onsite', 'on-site'])]
    
    # Interview types breakdown
    interview_types = {}
    for stage in interview_stages:
        stage_type = "Other"
        if "phone" in stage.name.lower():
            stage_type = "Phone Screen"
        elif "tech" in stage.name.lower():
            stage_type = "Technical"
        elif "onsite" in stage.name.lower() or "on-site" in stage.name.lower():
            stage_type = "On-site"
        elif "behavioral" in stage.name.lower():
            stage_type = "Behavioral"
        elif "final" in stage.name.lower():
            stage_type = "Final"
        
        interview_types[stage_type] = interview_types.get(stage_type, 0) + 1
    
    interview_type_breakdown = [
        {"type": type_name, "count": count}
        for type_name, count in interview_types.items()
    ]
    
    # Success rate calculation
    successful_interviews = len([s for s in interview_stages if s.outcome and s.outcome.lower() in ['passed', 'success', 'positive']])
    success_rate = (successful_interviews / len(interview_stages) * 100) if interview_stages else 0
    
    # Applications with interviews
    apps_with_interviews = len(set(s.application_id for s in interview_stages))
    interview_conversion_rate = (apps_with_interviews / len(applications) * 100) if applications else 0
    
    # Average interviews per application
    avg_interviews_per_app = len(interview_stages) / len(applications) if applications else 0
    
    # Interview outcomes
    outcome_counts = {}
    for stage in interview_stages:
        outcome = stage.outcome or "Pending"
        outcome_counts[outcome] = outcome_counts.get(outcome, 0) + 1
    
    interview_outcomes = [
        {"outcome": outcome, "count": count}
        for outcome, count in outcome_counts.items()
    ]
    
    return {
        "totalInterviews": len(interview_stages),
        "interviewTypeBreakdown": interview_type_breakdown,
        "successRate": round(success_rate, 1),
        "interviewConversionRate": round(interview_conversion_rate, 1),
        "avgInterviewsPerApp": round(avg_interviews_per_app, 1),
        "interviewOutcomes": interview_outcomes,
        "appsWithInterviews": apps_with_interviews
    }

def calculate_company_metrics(applications: List[models.Application], db: Session) -> Dict[str, Any]:
    """Calculate company-specific metrics"""
    
    companies_data = {}
    
    for app in applications:
        job = db.query(models.Job).filter(models.Job.id == app.job_id).first()
        if job and job.company_id:
            company = db.query(models.Company).filter(models.Company.id == job.company_id).first()
            if company:
                if company.name not in companies_data:
                    companies_data[company.name] = {
                        "applications": 0,
                        "interviews": 0,
                        "offers": 0,
                        "locations": set(),
                        "company_id": company.id
                    }
                companies_data[company.name]["applications"] += 1
                if company.location:
                    companies_data[company.name]["locations"].add(company.location)
    
    # Get stage data for companies
    for company_name, data in companies_data.items():
        company_apps = [app for app in applications 
                       if db.query(models.Job).filter(models.Job.id == app.job_id).first() and
                          db.query(models.Job).filter(models.Job.id == app.job_id).first().company_id == data["company_id"]]
        
        app_ids = [app.id for app in company_apps]
        if app_ids:
            company_stages = db.query(models.Stage).filter(models.Stage.application_id.in_(app_ids)).all()
            interview_stages = [s for s in company_stages if any(keyword in s.name.lower() for keyword in ['interview', 'phone', 'tech'])]
            offer_stages = [s for s in company_stages if 'offer' in s.name.lower() or s.outcome == 'offer']
            
            data["interviews"] = len(set(s.application_id for s in interview_stages))
            data["offers"] = len(set(s.application_id for s in offer_stages))
    
    # Top companies by applications
    top_companies = sorted(
        [(name, data) for name, data in companies_data.items()],
        key=lambda x: x[1]["applications"],
        reverse=True
    )[:10]
    
    top_companies_list = [
        {
            "name": name,
            "applications": data["applications"],
            "interviews": data["interviews"],
            "offers": data["offers"],
            "interview_rate": round((data["interviews"] / data["applications"]) * 100, 1) if data["applications"] > 0 else 0,
            "offer_rate": round((data["offers"] / data["applications"]) * 100, 1) if data["applications"] > 0 else 0
        }
        for name, data in top_companies
    ]
    
    # Company size distribution (placeholder)
    company_sizes = [
        {"size": "Startup (1-50)", "count": len([c for c in companies_data if len(c) < 10])},
        {"size": "Medium (51-500)", "count": len([c for c in companies_data if 10 <= len(c) < 20])},
        {"size": "Large (500+)", "count": len([c for c in companies_data if len(c) >= 20])}
    ]
    
    return {
        "totalCompanies": len(companies_data),
        "topCompanies": top_companies_list,
        "avgApplicationsPerCompany": round(len(applications) / len(companies_data), 1) if companies_data else 0,
        "companySizeDistribution": company_sizes
    }

def calculate_timeline_metrics(applications: List[models.Application], stages: List[models.Stage]) -> Dict[str, Any]:
    """Calculate timeline and duration metrics"""
    
    # Calculate process durations
    process_durations = []
    stage_durations = []
    
    for app in applications:
        app_stages = [s for s in stages if s.application_id == app.id]
        if app_stages:
            # Sort stages by creation date
            app_stages.sort(key=lambda x: x.created_at)
            
            # Calculate time from application to final stage
            final_stage = app_stages[-1]
            total_duration = (final_stage.created_at - app.created_at).days
            process_durations.append(total_duration)
            
            # Calculate time between stages
            for i in range(1, len(app_stages)):
                stage_gap = (app_stages[i].created_at - app_stages[i-1].created_at).days
                stage_durations.append({
                    "from_stage": app_stages[i-1].name,
                    "to_stage": app_stages[i].name,
                    "duration": stage_gap
                })
    
    avg_process_duration = sum(process_durations) / len(process_durations) if process_durations else 0
    
    # Stage duration averages
    stage_duration_avg = {}
    for duration in stage_durations:
        key = f"{duration['from_stage']} → {duration['to_stage']}"
        if key not in stage_duration_avg:
            stage_duration_avg[key] = []
        stage_duration_avg[key].append(duration['duration'])
    
    stage_transitions = [
        {
            "transition": transition,
            "avg_days": round(sum(durations) / len(durations), 1),
            "count": len(durations)
        }
        for transition, durations in stage_duration_avg.items()
        if len(durations) >= 2  # Only show transitions that happened at least twice
    ]
    
    # Weekly application trends
    weekly_trends = {}
    for app in applications:
        week_key = app.created_at.strftime("%Y-W%W")
        weekly_trends[week_key] = weekly_trends.get(week_key, 0) + 1
    
    weekly_data = [
        {"week": week, "applications": count}
        for week, count in sorted(weekly_trends.items())[-12:]  # Last 12 weeks
    ]
    
    # Bottleneck identification
    bottlenecks = []
    status_durations = {}
    for app in applications:
        app_stages = [s for s in stages if s.application_id == app.id]
        current_status_duration = (datetime.now(timezone.utc) - app.updated_at).days
        
        if app.status not in status_durations:
            status_durations[app.status] = []
        status_durations[app.status].append(current_status_duration)
    
    for status, durations in status_durations.items():
        if len(durations) >= 2:
            avg_duration = sum(durations) / len(durations)
            if avg_duration > 14:  # More than 2 weeks is considered a bottleneck
                bottlenecks.append({
                    "stage": status,
                    "avg_duration_days": round(avg_duration, 1),
                    "applications_count": len(durations)
                })
    
    return {
        "avgProcessDuration": round(avg_process_duration, 1),
        "stageTransitions": stage_transitions,
        "weeklyApplicationTrends": weekly_data,
        "bottlenecks": bottlenecks,
        "totalProcesses": len(process_durations)
    }

def calculate_salary_metrics(applications: List[models.Application], db: Session) -> Dict[str, Any]:
    """Calculate salary-related metrics"""
    
    salary_data = []
    job_titles_with_salary = []
    
    for app in applications:
        job = db.query(models.Job).filter(models.Job.id == app.job_id).first()
        if job:
            # Extract salary information
            if job.salary_min or job.salary_max:
                salary_info = {
                    "title": job.title,
                    "min_salary": job.salary_min or 0,
                    "max_salary": job.salary_max or 0,
                    "avg_salary": ((job.salary_min or 0) + (job.salary_max or 0)) / 2 if job.salary_min or job.salary_max else 0,
                    "application_status": app.status
                }
                salary_data.append(salary_info)
                job_titles_with_salary.append(job.title)
    
    # Calculate averages
    if salary_data:
        avg_min_salary = sum(s["min_salary"] for s in salary_data) / len(salary_data)
        avg_max_salary = sum(s["max_salary"] for s in salary_data) / len(salary_data)
        avg_salary_overall = sum(s["avg_salary"] for s in salary_data) / len(salary_data)
    else:
        avg_min_salary = avg_max_salary = avg_salary_overall = 0
    
    # Salary by job title
    title_salaries = {}
    for data in salary_data:
        title = data["title"]
        if title not in title_salaries:
            title_salaries[title] = []
        title_salaries[title].append(data["avg_salary"])
    
    salary_by_title = [
        {
            "title": title,
            "avg_salary": round(sum(salaries) / len(salaries), 0),
            "count": len(salaries)
        }
        for title, salaries in title_salaries.items()
        if len(salaries) >= 1
    ]
    
    # Salary ranges distribution
    salary_ranges = [
        {"range": "< $50k", "count": len([s for s in salary_data if s["avg_salary"] < 50000])},
        {"range": "$50k - $75k", "count": len([s for s in salary_data if 50000 <= s["avg_salary"] < 75000])},
        {"range": "$75k - $100k", "count": len([s for s in salary_data if 75000 <= s["avg_salary"] < 100000])},
        {"range": "$100k - $150k", "count": len([s for s in salary_data if 100000 <= s["avg_salary"] < 150000])},
        {"range": "$150k+", "count": len([s for s in salary_data if s["avg_salary"] >= 150000])}
    ]
    
    # Remove empty ranges
    salary_ranges = [r for r in salary_ranges if r["count"] > 0]
    
    return {
        "avgSalaryOffered": round(avg_salary_overall, 0),
        "salaryRange": {
            "min": round(avg_min_salary, 0),
            "max": round(avg_max_salary, 0)
        },
        "salaryByTitle": salary_by_title,
        "salaryRangeDistribution": salary_ranges,
        "applicationsWithSalary": len(salary_data),
        "totalApplications": len(applications)
    }

@router.get("/export/csv")
def export_analytics_csv(
    range_param: str = Query('6m', alias='range'),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Export analytics data as CSV"""
    
    # Get analytics data
    analytics_data = get_analytics(range_param, db, current_user)
    
    # Create temporary CSV file
    temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv', newline='')
    
    try:
        writer = csv.writer(temp_file)
        
        # Write overview metrics
        writer.writerow(['Metric', 'Value'])
        writer.writerow(['Total Applications', analytics_data['overview']['totalApplications']])
        writer.writerow(['Interview Rate (%)', analytics_data['overview']['interviewRate']])
        writer.writerow(['Offer Rate (%)', analytics_data['overview']['offerRate']])
        writer.writerow(['Avg Response Time (days)', analytics_data['overview']['avgResponseTime']])
        
        # Write status distribution
        writer.writerow([])  # Empty row
        writer.writerow(['Status Distribution'])
        writer.writerow(['Status', 'Count'])
        for item in analytics_data['overview']['statusDistribution']:
            writer.writerow([item['label'], item['value']])
        
        temp_file.close()
        
        return FileResponse(
            temp_file.name,
            media_type='text/csv',
            filename=f'analytics-data-{range_param}.csv'
        )
        
    except Exception as e:
        temp_file.close()
        raise HTTPException(status_code=500, detail=f"Failed to generate CSV: {str(e)}")

@router.get("/export/pdf")
def export_analytics_pdf(
    range_param: str = Query('6m', alias='range'),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Export analytics data as PDF"""
    
    # For now, return a simple text file as PDF generation requires additional libraries
    analytics_data = get_analytics(range_param, db, current_user)
    
    temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt')
    
    try:
        temp_file.write("JobFlow Analytics Report\n")
        temp_file.write("=" * 25 + "\n\n")
        temp_file.write(f"Time Range: {range_param}\n")
        temp_file.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        # Write overview metrics
        overview = analytics_data['overview']
        temp_file.write("Overview Metrics:\n")
        temp_file.write(f"- Total Applications: {overview['totalApplications']}\n")
        temp_file.write(f"- Interview Rate: {overview['interviewRate']}%\n")
        temp_file.write(f"- Offer Rate: {overview['offerRate']}%\n")
        temp_file.write(f"- Avg Response Time: {overview['avgResponseTime']} days\n\n")
        
        # Write status distribution
        temp_file.write("Status Distribution:\n")
        for item in overview['statusDistribution']:
            temp_file.write(f"- {item['label']}: {item['value']}\n")
        
        temp_file.close()
        
        return FileResponse(
            temp_file.name,
            media_type='text/plain',
            filename=f'analytics-report-{range_param}.txt'
        )
        
    except Exception as e:
        temp_file.close()
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
