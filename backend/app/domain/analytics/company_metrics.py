"""
Company Analysis Metrics

Functions for analyzing:
- Company-level aggregations
- Top companies by application count
- Company size distributions
- Average applications per company
"""
from typing import List, Dict, Any
from .dto import ApplicationLiteDTO, JobLiteDTO, CompanyLiteDTO


def calculate_company_metrics(apps: List[ApplicationLiteDTO], jobs: Dict[str, JobLiteDTO], companies: Dict[str, CompanyLiteDTO]) -> Dict[str, Any]:
    """Aggregate application statistics by company."""
    if not isinstance(apps, list):
        raise ValueError(f"apps must be a list, got {type(apps).__name__}")
    if not isinstance(jobs, dict):
        raise ValueError(f"jobs must be a dict, got {type(jobs).__name__}")
    if not isinstance(companies, dict):
        raise ValueError(f"companies must be a dict, got {type(companies).__name__}")
    
    comp_data: Dict[str, Dict] = {}
    for a in apps:
        if not a or not hasattr(a, 'job_id') or not a.job_id:
            continue
        
        j = jobs.get(a.job_id)
        if not j or not hasattr(j, 'company_id') or not j.company_id:
            continue
        
        c = companies.get(j.company_id)
        if not c or not hasattr(c, 'name') or not c.name:
            continue
        
        d = comp_data.setdefault(c.name, {
            "applications": 0, 
            "interviews": 0, 
            "offers": 0, 
            "company_id": c.id if hasattr(c, 'id') else None
        })
        d["applications"] += 1
    
    try:
        top = sorted(comp_data.items(), key=lambda kv: kv[1]["applications"], reverse=True)[:10]
    except (TypeError, ValueError):
        top = []
    
    top_list = []
    for name, d in top:
        if not name or not isinstance(d, dict):
            continue
        
        apps_count = d.get("applications", 0)
        interviews_count = d.get("interviews", 0)
        offers_count = d.get("offers", 0)
        
        top_list.append({
            "name": name,
            "applications": apps_count,
            "interviews": interviews_count,
            "offers": offers_count,
            "interview_rate": round((interviews_count/apps_count)*100, 1) if apps_count > 0 else 0,
            "offer_rate": round((offers_count/apps_count)*100, 1) if apps_count > 0 else 0,
        })
    
    sizes = [
        {"size": "Startup (1-50)", "count": len([n for n in comp_data if n and len(n) < 10])},
        {"size": "Medium (51-500)", "count": len([n for n in comp_data if n and 10 <= len(n) < 20])},
        {"size": "Large (500+)", "count": len([n for n in comp_data if n and len(n) >= 20])},
    ]
    
    total_companies = len(comp_data) if comp_data else 0
    total_apps = len(apps) if apps else 0
    
    return {
        "totalCompanies": total_companies,
        "topCompanies": top_list,
        "avgApplicationsPerCompany": round(total_apps/total_companies, 1) if total_companies > 0 else 0,
        "companySizeDistribution": sizes,
    }
