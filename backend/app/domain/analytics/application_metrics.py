"""
Application Statistics and Metrics

Functions for calculating:
- Application status distributions
- Monthly application trends
- Top job titles
- Company diversity
"""
from typing import List, Dict, Any
from .dto import ApplicationLiteDTO, JobLiteDTO, CompanyLiteDTO


def calculate_application_metrics(apps: List[ApplicationLiteDTO], jobs: Dict, companies: Dict) -> Dict[str, Any]:
    """Calculate detailed application statistics and distributions."""
    if not isinstance(apps, list):
        raise ValueError(f"apps must be a list, got {type(apps).__name__}")
    if not isinstance(jobs, dict):
        raise ValueError(f"jobs must be a dict, got {type(jobs).__name__}")
    if not isinstance(companies, dict):
        raise ValueError(f"companies must be a dict, got {type(companies).__name__}")
    
    status_counts: Dict[str,int] = {}
    for a in apps:
        if a and hasattr(a, 'status') and a.status:
            status_counts[a.status] = status_counts.get(a.status,0)+1
    
    total_apps = len(apps) if apps else 0
    status_breakdown = [
        {"status": s, "count": c, "percentage": round((c/total_apps)*100,1) if total_apps > 0 else 0}
        for s,c in status_counts.items()
    ]

    monthly = {}
    for a in apps:
        if a and hasattr(a, 'created_at') and a.created_at:
            try:
                key = a.created_at.strftime("%Y-%m")
                monthly[key] = monthly.get(key, 0)+1
            except (AttributeError, ValueError):
                continue
    applications_by_month = [{"month": m, "count": c} for m,c in sorted(monthly.items())]

    job_titles = []
    company_names = []
    for a in apps:
        if not a or not hasattr(a, 'job_id'):
            continue
        
        j = jobs.get(a.job_id) if a.job_id else None
        if j and hasattr(j, 'title') and j.title:
            job_titles.append(j.title)
            
            if hasattr(j, 'company_id') and j.company_id:
                c = companies.get(j.company_id)
                if c and hasattr(c, 'name') and c.name:
                    company_names.append(c.name)

    title_counts: Dict[str,int] = {}
    for t in job_titles:
        if t:
            title_counts[t] = title_counts.get(t,0)+1
    
    try:
        top_job_titles = [
            {"title": t, "count": n}
            for t,n in sorted(title_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
    except (TypeError, ValueError):
        top_job_titles = []

    return {
        "totalApplications": len(apps) if apps else 0,
        "statusBreakdown": status_breakdown,
        "applicationsByMonth": applications_by_month,
        "topJobTitles": top_job_titles,
        "uniqueCompanies": len(set(company_names)) if company_names else 0,
    }
