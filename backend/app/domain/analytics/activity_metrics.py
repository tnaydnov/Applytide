"""
Activity, Source, Experiment, and Timing Metrics

Calculation functions for analyzing:
- Daily application activity and streaks
- Source effectiveness (LinkedIn, Indeed, etc.)
- A/B testing (resume versions, cover letters)
- Optimal submission timing (day/hour patterns)
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from .dto import ApplicationLiteDTO, StageLiteDTO


# Helper utilities
def _date_str(dt):
    """Convert datetime to ISO date string (YYYY-MM-DD)."""
    return dt.strftime("%Y-%m-%d")


def _weekday_label(i):
    """Convert weekday index (0-6) to label (Mon-Sun)."""
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i % 7]


def calculate_activity_metrics(applications: List[ApplicationLiteDTO]) -> Dict[str, Any]:
    """Calculate daily application activity and streak statistics."""
    if not isinstance(applications, list):
        raise ValueError(f"applications must be a list, got {type(applications).__name__}")
    
    if not applications:
        return {"activityByDay": [], "streak": {"current": 0, "best": 0}}
    
    today = datetime.now(timezone.utc).date()
    days_back = 84
    counts = {}
    
    for app in applications:
        if not app or not hasattr(app, 'created_at') or not app.created_at:
            continue
        try:
            key = _date_str(app.created_at.date())
            counts[key] = counts.get(key, 0) + 1
        except (AttributeError, TypeError):
            continue
    
    series = []
    for i in range(days_back):
        d = today - timedelta(days=(days_back - 1 - i))
        key = d.strftime("%Y-%m-%d")
        series.append({"date": key, "count": counts.get(key, 0)})

    cur = best = running = 0
    for i in range(days_back-1, -1, -1):
        if series[i]["count"] > 0:
            running += 1
            cur = running
        else:
            best = max(best, running)
            running = 0
    best = max(best, running)
    return {"activityByDay": series, "streak": {"current": cur, "best": best}}


def calculate_sources_metrics(apps: List[ApplicationLiteDTO], stages: List[StageLiteDTO]) -> Dict[str, Any]:
    """Analyze application effectiveness by source (LinkedIn, Indeed, etc.)."""
    if not isinstance(apps, list):
        raise ValueError(f"apps must be a list, got {type(apps).__name__}")
    if not isinstance(stages, list):
        raise ValueError(f"stages must be a list, got {type(stages).__name__}")
    
    if not apps:
        return {
            "breakdown": [],
            "interviewRateBySource": [],
            "offerRateBySource": [],
            "topSources": []
        }
    
    per = {}
    
    for a in apps:
        if not a or not hasattr(a, 'id'):
            continue
        src = (a.source or "Other")
        d = per.setdefault(src, {"apps": 0, "int_apps": set(), "off_apps": set()})
        d["apps"] += 1
    
    app_to_src = {}
    for a in apps:
        if a and hasattr(a, 'id'):
            app_to_src[a.id] = (a.source or "Other")
    
    for s in stages:
        if not s or not hasattr(s, 'application_id'):
            continue
        src = app_to_src.get(s.application_id, "Other")
        nm = (s.name or "").lower()
        if any(k in nm for k in ["interview", "phone", "screen", "tech", "onsite", "on-site"]):
            per.get(src, {}).get("int_apps", set()).add(s.application_id)
        if "offer" in nm or (s.outcome or "").lower() == "offer":
            per.get(src, {}).get("off_apps", set()).add(s.application_id)
    
    breakdown, interview_rate, offer_rate, top_sources = [], [], [], []
    for src, d in per.items():
        apps_n = d["apps"]
        if apps_n == 0:
            continue
        breakdown.append({"label": src, "value": apps_n})
        ir = round((len(d["int_apps"]) / apps_n) * 100, 1) if apps_n > 0 else 0
        orate = round((len(d["off_apps"]) / apps_n) * 100, 1) if apps_n > 0 else 0
        interview_rate.append({"label": src, "value": ir})
        offer_rate.append({"label": src, "value": orate})
        top_sources.append({"label": src, "applications": apps_n, "interviewRate": ir, "offerRate": orate})
    
    interview_rate.sort(key=lambda x: x["value"], reverse=True)
    offer_rate.sort(key=lambda x: x["value"], reverse=True)
    top_sources.sort(key=lambda x: x["applications"], reverse=True)
    
    return {
        "breakdown": breakdown,
        "interviewRateBySource": interview_rate,
        "offerRateBySource": offer_rate,
        "topSources": top_sources
    }


def calculate_experiments_metrics(apps: List[ApplicationLiteDTO], stages: List[StageLiteDTO]) -> Dict[str, Any]:
    """Analyze A/B test results for resumes and cover letters."""
    if not isinstance(apps, list):
        raise ValueError(f"apps must be a list, got {type(apps).__name__}")
    if not isinstance(stages, list):
        raise ValueError(f"stages must be a list, got {type(stages).__name__}")
    
    if not apps:
        return {
            "resumeVersions": [],
            "coverLetterImpact": {
                "withCL": {"rate": 0, "count": 0},
                "withoutCL": {"rate": 0, "count": 0}
            }
        }
    
    interviewed = set()
    for s in stages:
        if not s or not hasattr(s, 'application_id') or not hasattr(s, 'name'):
            continue
        nm = (s.name or "").lower()
        if any(k in nm for k in ["interview","phone","screen","tech","onsite","on-site"]):
            interviewed.add(s.application_id)
    
    per = {}
    for a in apps:
        if not a or not hasattr(a, 'id') or not hasattr(a, 'resume_id'):
            continue
        key = str(a.resume_id) if a.resume_id else "Default"
        d = per.setdefault(key, {"apps": 0, "int": 0})
        d["apps"] += 1
        if a.id in interviewed:
            d["int"] += 1
    
    resume_versions = []
    for key, d in per.items():
        apps_count = d["apps"]
        rate = round((d["int"] / apps_count) * 100, 1) if apps_count > 0 else 0
        resume_versions.append({"label": key, "interviewRate": rate, "count": apps_count})
    resume_versions.sort(key=lambda x: x["interviewRate"], reverse=True)

    with_cl = {"apps": 0, "int": 0}
    without_cl = {"apps": 0, "int": 0}
    for a in apps:
        if not a or not hasattr(a, 'id') or not hasattr(a, 'has_cover_letter'):
            continue
        tgt = with_cl if bool(a.has_cover_letter) else without_cl
        tgt["apps"] += 1
        if a.id in interviewed:
            tgt["int"] += 1
    
    return {
        "resumeVersions": resume_versions,
        "coverLetterImpact": {
            "withCL": {
                "rate": round((with_cl["int"]/with_cl["apps"])*100,1) if with_cl["apps"] > 0 else 0,
                "count": with_cl["apps"]
            },
            "withoutCL": {
                "rate": round((without_cl["int"]/without_cl["apps"])*100,1) if without_cl["apps"] > 0 else 0,
                "count": without_cl["apps"]
            },
        }
    }


def calculate_best_time_metrics(apps: List[ApplicationLiteDTO]) -> Dict[str, Any]:
    """Identify optimal application submission times based on user patterns."""
    if not isinstance(apps, list):
        raise ValueError(f"apps must be a list, got {type(apps).__name__}")
    
    if not apps:
        return {"byWeekday": [], "byHour": [], "bestWindowText": ""}
    
    wd = {i:0 for i in range(7)}
    hr = {i:0 for i in range(24)}
    
    for a in apps:
        if not a or not hasattr(a, 'created_at') or not a.created_at:
            continue
        try:
            dt = a.created_at
            wd[dt.weekday()] += 1
            hr[dt.hour] += 1
        except (AttributeError, TypeError):
            continue
    
    by_wd = [{"label": _weekday_label(k), "value": v} for k,v in wd.items()]
    by_wd.sort(key=lambda x: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].index(x["label"]))
    by_hr = [{"label": f"{h}:00", "value": v} for h,v in hr.items()]
    by_hr.sort(key=lambda x: int(x["label"].split(":")[0]))
    top_day = max(by_wd, key=lambda x: x["value"]) if by_wd else None
    top_hour = max(by_hr, key=lambda x: x["value"]) if by_hr else None
    best_text = f"{top_day['label']} around {top_hour['label']}" if (top_day and top_hour) else ""
    
    return {"byWeekday": by_wd, "byHour": by_hr, "bestWindowText": best_text}
