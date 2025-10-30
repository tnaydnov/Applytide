"""
Timeline and Bottleneck Analysis Metrics

Functions for analyzing:
- Application process durations
- Stage transitions and timing
- Weekly application trends
- Process bottlenecks
"""
from datetime import datetime, timezone
from typing import List, Dict, Any
from .dto import ApplicationLiteDTO, StageLiteDTO


def calculate_timeline_metrics(apps: List[ApplicationLiteDTO], stages: List[StageLiteDTO]) -> Dict[str, Any]:
    """Analyze application timelines and identify bottlenecks."""
    if not isinstance(apps, list):
        raise ValueError(f"apps must be a list, got {type(apps).__name__}")
    if not isinstance(stages, list):
        raise ValueError(f"stages must be a list, got {type(stages).__name__}")
    
    process_durations, stage_durations = [], []
    app_stages_map: Dict[str, List[StageLiteDTO]] = {}
    for s in stages:
        if s and hasattr(s, 'application_id') and s.application_id:
            app_stages_map.setdefault(s.application_id, []).append(s)
    
    for a in apps:
        if not a or not hasattr(a, 'id') or not a.id or not hasattr(a, 'created_at') or not a.created_at:
            continue
        
        st_list = app_stages_map.get(a.id, [])
        if not st_list:
            continue
        
        try:
            st = sorted(
                [s for s in st_list if s and hasattr(s, 'created_at') and s.created_at],
                key=lambda x: x.created_at
            )
        except (TypeError, AttributeError):
            continue
        
        if not st:
            continue
        
        final = st[-1]
        try:
            duration_days = (final.created_at - a.created_at).days
            process_durations.append(duration_days)
        except (AttributeError, TypeError):
            pass
        
        for i in range(1, len(st)):
            if not st[i] or not st[i-1]:
                continue
            if not hasattr(st[i], 'name') or not hasattr(st[i-1], 'name'):
                continue
            if not hasattr(st[i], 'created_at') or not hasattr(st[i-1], 'created_at'):
                continue
            
            try:
                gap = (st[i].created_at - st[i-1].created_at).days
                stage_durations.append({
                    "from_stage": st[i-1].name if st[i-1].name else "Unknown",
                    "to_stage": st[i].name if st[i].name else "Unknown",
                    "duration": gap
                })
            except (AttributeError, TypeError):
                continue
    
    avg_proc = sum(process_durations)/len(process_durations) if len(process_durations) > 0 else 0
    
    stage_avg: Dict[str, list] = {}
    for d in stage_durations:
        if not isinstance(d, dict):
            continue
        from_stage = d.get("from_stage", "Unknown")
        to_stage = d.get("to_stage", "Unknown")
        duration = d.get("duration", 0)
        
        key = f"{from_stage} → {to_stage}"
        stage_avg.setdefault(key, []).append(duration)
    
    transitions = []
    for k, v in stage_avg.items():
        if not k or not v or len(v) < 2:
            continue
        try:
            avg_days = sum(v)/len(v)
            transitions.append({
                "transition": k,
                "avg_days": round(avg_days, 1),
                "count": len(v)
            })
        except (TypeError, ZeroDivisionError):
            continue

    weekly = {}
    for a in apps:
        if not a or not hasattr(a, 'created_at') or not a.created_at:
            continue
        try:
            k = a.created_at.strftime("%Y-W%W")
            weekly[k] = weekly.get(k, 0) + 1
        except (AttributeError, ValueError):
            continue
    
    try:
        weekly_data = [{"week": wk, "applications": cnt} for wk, cnt in sorted(weekly.items())[-12:]]
    except (TypeError, ValueError):
        weekly_data = []

    now = datetime.now(timezone.utc)
    status_durations: Dict[str, list] = {}
    
    for a in apps:
        if not a or not hasattr(a, 'status') or not a.status:
            continue
        if not hasattr(a, 'updated_at') or not a.updated_at:
            continue
        
        try:
            days_since_update = (now - a.updated_at).days
            status_durations.setdefault(a.status, []).append(days_since_update)
        except (AttributeError, TypeError):
            continue
    
    bottlenecks = []
    for status, arr in status_durations.items():
        if not status or not arr or len(arr) < 2:
            continue
        
        try:
            avg = sum(arr)/len(arr)
            if avg > 14:
                bottlenecks.append({
                    "stage": status,
                    "avg_duration_days": round(avg, 1),
                    "applications_count": len(arr)
                })
        except (TypeError, ZeroDivisionError):
            continue
    
    return {
        "avgProcessDuration": round(avg_proc, 1),
        "stageTransitions": transitions,
        "weeklyApplicationTrends": weekly_data,
        "bottlenecks": bottlenecks,
        "totalProcesses": len(process_durations),
    }
