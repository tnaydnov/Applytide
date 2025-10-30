"""
Timeline Expectations and Overview Metrics

Functions for calculating:
- Timeline expectations (response, interview, decision times)
- High-level overview metrics and dashboards
"""
from datetime import datetime, timedelta
from statistics import median
from typing import List, Dict, Any
from .dto import ApplicationLiteDTO, StageLiteDTO


def calculate_expectations_metrics(apps: List[ApplicationLiteDTO], stages: List[StageLiteDTO]) -> Dict[str, Any]:
    """Calculate timeline expectations based on historical data."""
    if not isinstance(apps, list):
        raise ValueError(f"apps must be a list, got {type(apps).__name__}")
    if not isinstance(stages, list):
        raise ValueError(f"stages must be a list, got {type(stages).__name__}")
    
    if not apps:
        return {"medians": {}, "p75": {}}
    
    app_stages_map: Dict[str, List[StageLiteDTO]] = {}
    for s in stages:
        if s and hasattr(s, 'application_id'):
            app_stages_map.setdefault(s.application_id, []).append(s)
    
    response_days, interview_days, decision_days = [], [], []
    
    for a in apps:
        if not a or not hasattr(a, 'id') or not hasattr(a, 'created_at') or not a.created_at:
            continue
        
        st = app_stages_map.get(a.id, [])
        if not st:
            continue
        
        try:
            st_sorted = sorted([s for s in st if s and hasattr(s, 'created_at') and s.created_at], 
                             key=lambda x: x.created_at)
            if not st_sorted:
                continue
            
            first = st_sorted[0]
            if first.created_at:
                days = (first.created_at - a.created_at).days
                if days >= 0:
                    response_days.append(days)
            
            inter = next((x for x in st_sorted 
                         if hasattr(x, 'name') and x.name and 
                         any(k in x.name.lower() for k in ["interview","screen"])), None)
            if inter and inter.created_at:
                days = (inter.created_at - a.created_at).days
                if days >= 0:
                    interview_days.append(days)
            
            decis = next((x for x in reversed(st_sorted)
                         if hasattr(x, 'name') and hasattr(x, 'outcome') and x.name and
                         ("offer" in x.name.lower() or 
                          (x.outcome and x.outcome.lower() in ["offer","rejected","hired","declined"]))), None)
            if decis and decis.created_at:
                days = (decis.created_at - a.created_at).days
                if days >= 0:
                    decision_days.append(days)
        except (AttributeError, TypeError, ValueError):
            continue
    
    def stats(nums):
        if not nums:
            return None, None
        try:
            arr = sorted([n for n in nums if isinstance(n, (int,float)) and n>=0])
            if not arr:
                return None, None
            m = int(median(arr))
            p75_idx = max(0, int(len(arr)*0.75)-1)
            p75i = int(arr[p75_idx])
            return m, p75i
        except (ValueError, TypeError, IndexError):
            return None, None
    
    m_resp, p_resp = stats(response_days)
    m_int, p_int = stats(interview_days)
    m_dec, p_dec = stats(decision_days)
    med = {k:v for k,v in [("response",m_resp),("interview",m_int),("decision",m_dec)] if v is not None}
    p75 = {k:v for k,v in [("response",p_resp),("interview",p_int),("decision",p_dec)] if v is not None}
    return {"medians": med, "p75": p75}


def calculate_overview_metrics(apps: List[ApplicationLiteDTO], stages: List[StageLiteDTO], start_date: datetime) -> Dict[str, Any]:
    """Calculate high-level overview metrics for dashboard."""
    if not isinstance(apps, list):
        raise ValueError(f"apps must be a list, got {type(apps).__name__}")
    if not isinstance(stages, list):
        raise ValueError(f"stages must be a list, got {type(stages).__name__}")
    if not isinstance(start_date, datetime):
        raise ValueError(f"start_date must be datetime, got {type(start_date).__name__}")
    
    total = len(apps)
    
    if total == 0:
        return {
            "totalApplications": 0,
            "applicationsChange": 0,
            "interviewRate": 0,
            "interviewRateChange": 0,
            "offerRate": 0,
            "offerRateChange": 0,
            "avgResponseTime": 0,
            "responseTimeChange": 0,
            "statusDistribution": [],
            "applicationsOverTime": [],
            "funnel": []
        }
    
    ints = [s for s in stages if s and hasattr(s, 'name') and s.name and 
            any(k in s.name.lower() for k in ["interview","phone screen"])]
    unique_int_apps = len(set(s.application_id for s in ints if s and hasattr(s, 'application_id')))
    interview_rate = (unique_int_apps / total * 100) if total > 0 else 0
    
    offers = [s for s in stages if s and hasattr(s, 'name') and hasattr(s, 'outcome') and
              ("offer" in (s.name or "").lower() or (s.outcome or "").lower() == "offer")]
    apps_with_offers = len(set(s.application_id for s in offers if s and hasattr(s, 'application_id')))
    offer_rate = (apps_with_offers / total * 100) if total > 0 else 0

    app_stages_map: Dict[str, List[StageLiteDTO]] = {}
    for s in stages:
        if s and hasattr(s, 'application_id'):
            app_stages_map.setdefault(s.application_id, []).append(s)
    
    response_times = []
    for a in apps:
        if not a or not hasattr(a, 'id') or not hasattr(a, 'created_at') or not a.created_at:
            continue
        st = app_stages_map.get(a.id, [])
        if st:
            try:
                valid_stages = [s for s in st if s and hasattr(s, 'created_at') and s.created_at]
                if valid_stages:
                    first = min(valid_stages, key=lambda x: x.created_at)
                    days = (first.created_at - a.created_at).days
                    if days >= 0:
                        response_times.append(days)
            except (AttributeError, TypeError, ValueError):
                continue
    avg_resp = sum(response_times)/len(response_times) if response_times else 0

    status_counts: Dict[str,int] = {}
    for a in apps:
        if a and hasattr(a, 'status') and a.status:
            status_counts[a.status] = status_counts.get(a.status,0)+1
    status_dist = [{"label": k, "value": v} for k,v in status_counts.items()]

    applications_over_time = []
    for i in range(12):
        week_start = start_date + timedelta(weeks=i)
        week_end = week_start + timedelta(weeks=1)
        week_apps = [a for a in apps if a and hasattr(a, 'created_at') and a.created_at and
                    week_start <= a.created_at < week_end]
        applications_over_time.append({"date": week_start.strftime("%Y-%m-%d"), "count": len(week_apps)})

    funnel = [
        {"name": "Applied", "count": total},
        {"name": "Phone Screen", "count": len([s for s in stages if s and hasattr(s, 'name') and s.name and "phone" in s.name.lower()])},
        {"name": "Technical", "count": len([s for s in stages if s and hasattr(s, 'name') and s.name and any(k in s.name.lower() for k in ["technical","tech"])])},
        {"name": "On-site", "count": len([s for s in stages if s and hasattr(s, 'name') and s.name and any(k in s.name.lower() for k in ["on-site","onsite"])])},
        {"name": "Offer", "count": apps_with_offers},
    ]

    return {
        "totalApplications": total,
        "applicationsChange": 0,
        "interviewRate": round(interview_rate, 1),
        "interviewRateChange": 0,
        "offerRate": round(offer_rate, 1),
        "offerRateChange": 0,
        "avgResponseTime": round(avg_resp, 1),
        "responseTimeChange": 0,
        "statusDistribution": status_dist,
        "applicationsOverTime": applications_over_time,
        "funnel": funnel,
    }
