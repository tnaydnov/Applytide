"""
Interview Analysis Metrics

Functions for analyzing:
- Interview types and distributions
- Interview success rates
- Interview conversion rates
- Interview outcomes
"""
from typing import List, Dict, Any
from .dto import StageLiteDTO, ApplicationLiteDTO


def calculate_interview_metrics(stages: List[StageLiteDTO], apps: List[ApplicationLiteDTO]) -> Dict[str, Any]:
    """Analyze interview stages and outcomes."""
    if not isinstance(stages, list):
        raise ValueError(f"stages must be a list, got {type(stages).__name__}")
    if not isinstance(apps, list):
        raise ValueError(f"apps must be a list, got {type(apps).__name__}")
    
    interview_stages = [
        s for s in stages 
        if s and hasattr(s, 'name') and s.name and 
        any(k in s.name.lower() for k in ['interview','phone screen','tech','onsite','on-site'])
    ]
    
    interview_types: Dict[str,int] = {}
    for s in interview_stages:
        if not s or not hasattr(s, 'name') or not s.name:
            continue
        
        name = s.name.lower()
        t = "Other"
        if "phone" in name: t = "Phone Screen"
        elif "tech" in name: t = "Technical"
        elif "onsite" in name or "on-site" in name: t = "On-site"
        elif "behavioral" in name: t = "Behavioral"
        elif "final" in name: t = "Final"
        interview_types[t] = interview_types.get(t,0)+1
    
    interview_type_breakdown = [{"type": k, "count": v} for k,v in interview_types.items()]
    
    successful = len([
        s for s in interview_stages 
        if s and hasattr(s, 'outcome') and s.outcome and 
        s.outcome.lower() in ["passed","success","positive"]
    ])
    success_rate = (successful/len(interview_stages)*100) if len(interview_stages) > 0 else 0
    
    apps_with_int_ids = set()
    for s in interview_stages:
        if s and hasattr(s, 'application_id') and s.application_id:
            apps_with_int_ids.add(s.application_id)
    apps_with_int = len(apps_with_int_ids)
    
    total_apps = len(apps) if apps else 0
    interview_conversion_rate = (apps_with_int/total_apps*100) if total_apps > 0 else 0
    avg_per_app = len(interview_stages)/total_apps if total_apps > 0 else 0
    
    outcomes: Dict[str,int] = {}
    for s in interview_stages:
        if not s or not hasattr(s, 'outcome'):
            continue
        oc = s.outcome if s.outcome else "Pending"
        outcomes[oc] = outcomes.get(oc,0)+1
    interview_outcomes = [{"outcome": k, "count": v} for k,v in outcomes.items()]
    
    return {
        "totalInterviews": len(interview_stages),
        "interviewTypeBreakdown": interview_type_breakdown,
        "successRate": round(success_rate,1),
        "interviewConversionRate": round(interview_conversion_rate,1),
        "avgInterviewsPerApp": round(avg_per_app,1),
        "interviewOutcomes": interview_outcomes,
        "appsWithInterviews": apps_with_int,
    }
