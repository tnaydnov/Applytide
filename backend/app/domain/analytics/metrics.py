from __future__ import annotations
from datetime import datetime, timezone, timedelta
from statistics import median
from typing import List, Dict, Any, Iterable
from .dto import ApplicationLiteDTO, StageLiteDTO, JobLiteDTO, CompanyLiteDTO

def _date_str(dt): return dt.strftime("%Y-%m-%d")
def _weekday_label(i): return ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i % 7]

def calculate_activity_metrics(applications: List[ApplicationLiteDTO]) -> Dict[str, Any]:
    if not applications:
        return {"activityByDay": [], "streak": {"current": 0, "best": 0}}
    today = datetime.now(timezone.utc).date()
    days_back = 84
    counts = {}
    for app in applications:
        key = _date_str(app.created_at.date())
        counts[key] = counts.get(key, 0) + 1
    series = []
    for i in range(days_back):
        d = today - timedelta(days=(days_back - 1 - i))
        key = d.strftime("%Y-%m-%d")
        series.append({"date": key, "count": counts.get(key, 0)})

    cur = best = running = 0
    for i in range(days_back-1, -1, -1):
        if series[i]["count"] > 0:
            running += 1; cur = running
        else:
            best = max(best, running); running = 0
    best = max(best, running)
    return {"activityByDay": series, "streak": {"current": cur, "best": best}}

def calculate_sources_metrics(apps: List[ApplicationLiteDTO], stages: List[StageLiteDTO]) -> Dict[str, Any]:
    breakdown, interview_rate, offer_rate, top_sources = [], [], [], []
    per = {}
    for a in apps:
        src = (a.source or "Other")
        d = per.setdefault(src, {"apps": 0, "int_apps": set(), "off_apps": set()})
        d["apps"] += 1
    app_to_src = {a.id: (a.source or "Other") for a in apps}
    for s in stages:
        src = app_to_src.get(s.application_id, "Other")
        nm = (s.name or "").lower()
        if any(k in nm for k in ["interview", "phone", "screen", "tech", "onsite", "on-site"]):
            per[src]["int_apps"].add(s.application_id)
        if "offer" in nm or (s.outcome or "").lower() == "offer":
            per[src]["off_apps"].add(s.application_id)
    for src, d in per.items():
        apps_n = d["apps"]
        breakdown.append({"label": src, "value": apps_n})
        ir = round((len(d["int_apps"]) / apps_n) * 100, 1) if apps_n else 0
        orate = round((len(d["off_apps"]) / apps_n) * 100, 1) if apps_n else 0
        interview_rate.append({"label": src, "value": ir})
        offer_rate.append({"label": src, "value": orate})
        top_sources.append({"label": src, "applications": apps_n, "interviewRate": ir, "offerRate": orate})
    interview_rate.sort(key=lambda x: x["value"], reverse=True)
    offer_rate.sort(key=lambda x: x["value"], reverse=True)
    top_sources.sort(key=lambda x: x["applications"], reverse=True)
    return {"breakdown": breakdown, "interviewRateBySource": interview_rate, "offerRateBySource": offer_rate, "topSources": top_sources}

def calculate_experiments_metrics(apps: List[ApplicationLiteDTO], stages: List[StageLiteDTO]) -> Dict[str, Any]:
    interviewed = set()
    for s in stages:
        nm = (s.name or "").lower()
        if any(k in nm for k in ["interview","phone","screen","tech","onsite","on-site"]):
            interviewed.add(s.application_id)
    out = {"resumeVersions": [], "coverLetterImpact": None}
    # resume versions (by resume_id)
    per = {}
    for a in apps:
        key = str(a.resume_id) if a.resume_id else "Default"
        d = per.setdefault(key, {"apps": 0, "int": 0})
        d["apps"] += 1
        if a.id in interviewed: d["int"] += 1
    for key, d in per.items():
        rate = round((d["int"] / d["apps"]) * 100, 1) if d["apps"] else 0
        out["resumeVersions"].append({"label": key, "interviewRate": rate, "count": d["apps"]})
    out["resumeVersions"].sort(key=lambda x: x["interviewRate"], reverse=True)

    # cover letter impact
    with_cl = {"apps": 0, "int": 0}
    without_cl = {"apps": 0, "int": 0}
    for a in apps:
        tgt = with_cl if bool(a.has_cover_letter) else without_cl
        tgt["apps"] += 1
        if a.id in interviewed: tgt["int"] += 1
    out["coverLetterImpact"] = {
        "withCL": {"rate": round((with_cl["int"]/with_cl["apps"])*100,1) if with_cl["apps"] else 0, "count": with_cl["apps"]},
        "withoutCL": {"rate": round((without_cl["int"]/without_cl["apps"])*100,1) if without_cl["apps"] else 0, "count": without_cl["apps"]},
    }
    return out

def calculate_best_time_metrics(apps: List[ApplicationLiteDTO]) -> Dict[str, Any]:
    if not apps: return {"byWeekday": [], "byHour": [], "bestWindowText": ""}
    wd = {i:0 for i in range(7)}; hr = {i:0 for i in range(24)}
    for a in apps:
        dt = a.created_at; wd[dt.weekday()] += 1; hr[dt.hour] += 1
    by_wd = [{"label": _weekday_label(k), "value": v} for k,v in wd.items()]
    by_wd.sort(key=lambda x: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].index(x["label"]))
    by_hr = [{"label": f"{h}:00", "value": v} for h,v in hr.items()]
    by_hr.sort(key=lambda x: int(x["label"].split(":")[0]))
    top_day = max(by_wd, key=lambda x: x["value"]) if by_wd else None
    top_hour = max(by_hr, key=lambda x: x["value"]) if by_hr else None
    best_text = f"{top_day['label']} around {top_hour['label']}" if (top_day and top_hour) else ""
    return {"byWeekday": by_wd, "byHour": by_hr, "bestWindowText": best_text}

def calculate_expectations_metrics(apps: List[ApplicationLiteDTO], stages: List[StageLiteDTO]) -> Dict[str, Any]:
    if not apps: return {"medians": {}, "p75": {}}
    app_stages_map: Dict[str, List[StageLiteDTO]] = {}
    for s in stages:
        app_stages_map.setdefault(s.application_id, []).append(s)
    response_days, interview_days, decision_days = [], [], []
    for a in apps:
        st = sorted(app_stages_map.get(a.id, []), key=lambda x: x.created_at)
        if not st: continue
        first = st[0].created_at; response_days.append((first - a.created_at).days)
        inter = next((x for x in st if any(k in (x.name or "").lower() for k in ["interview","screen"])), None)
        if inter: interview_days.append((inter.created_at - a.created_at).days)
        decis = next((x for x in reversed(st) if "offer" in (x.name or "").lower() or (x.outcome or "").lower() in ["offer","rejected","hired","declined"]), None)
        if decis: decision_days.append((decis.created_at - a.created_at).days)
    def stats(nums):
        arr = sorted([n for n in nums if isinstance(n, (int,float)) and n>=0])
        if not arr: return None, None
        m = int(median(arr)); p75i = int(arr[max(0, int(len(arr)*0.75)-1)]); return m, p75i
    m_resp, p_resp = stats(response_days)
    m_int, p_int = stats(interview_days)
    m_dec, p_dec = stats(decision_days)
    med = {k:v for k,v in [("response",m_resp),("interview",m_int),("decision",m_dec)] if v is not None}
    p75 = {k:v for k,v in [("response",p_resp),("interview",p_int),("decision",p_dec)] if v is not None}
    return {"medians": med, "p75": p75}

def calculate_overview_metrics(apps: List[ApplicationLiteDTO], stages: List[StageLiteDTO], start_date: datetime) -> Dict[str, Any]:
    total = len(apps)
    ints = [s for s in stages if any(k in (s.name or "").lower() for k in ["interview","phone screen"])]
    unique_int_apps = len(set(s.application_id for s in ints))
    interview_rate = (unique_int_apps / total * 100) if total else 0
    offers = [s for s in stages if "offer" in (s.name or "").lower() or (s.outcome or "").lower() == "offer"]
    apps_with_offers = len(set(s.application_id for s in offers))
    offer_rate = (apps_with_offers / total * 100) if total else 0

    # avg response time
    app_stages_map: Dict[str, List[StageLiteDTO]] = {}
    for s in stages: app_stages_map.setdefault(s.application_id, []).append(s)
    response_times = []
    for a in apps:
        st = app_stages_map.get(a.id, [])
        if st:
            first = min(st, key=lambda x: x.created_at)
            response_times.append((first.created_at - a.created_at).days)
    avg_resp = sum(response_times)/len(response_times) if response_times else 0

    # status distribution
    status_counts: Dict[str,int] = {}
    for a in apps: status_counts[a.status] = status_counts.get(a.status,0)+1
    status_dist = [{"label": k, "value": v} for k,v in status_counts.items()]

    # applications over time (12 weeks from start_date)
    applications_over_time = []
    for i in range(12):
        week_start = start_date + timedelta(weeks=i)
        week_end = week_start + timedelta(weeks=1)
        week_apps = [a for a in apps if week_start <= a.created_at < week_end]
        applications_over_time.append({"date": week_start.strftime("%Y-%m-%d"), "count": len(week_apps)})

    funnel = [
        {"name": "Applied", "count": total},
        {"name": "Phone Screen", "count": len([s for s in stages if "phone" in (s.name or "").lower()])},
        {"name": "Technical", "count": len([s for s in stages if any(k in (s.name or "").lower() for k in ["technical","tech"])])},
        {"name": "On-site", "count": len([s for s in stages if any(k in (s.name or "").lower() for k in ["on-site","onsite"])])},
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

def calculate_application_metrics(apps: List[ApplicationLiteDTO], jobs: Dict, companies: Dict) -> Dict[str, Any]:
    status_counts: Dict[str,int] = {}
    for a in apps: status_counts[a.status] = status_counts.get(a.status,0)+1
    status_breakdown = [
        {"status": s, "count": c, "percentage": round((c/len(apps))*100,1)} for s,c in status_counts.items()
    ] if apps else []

    monthly = {}
    for a in apps:
        key = a.created_at.strftime("%Y-%m")
        monthly[key] = monthly.get(key, 0)+1
    applications_by_month = [{"month": m, "count": c} for m,c in sorted(monthly.items())]

    job_titles = []
    company_names = []
    for a in apps:
        j = jobs.get(a.job_id)
        if j:
            job_titles.append(j.title)
            if j.company_id:
                c = companies.get(j.company_id)
                if c: company_names.append(c.name)

    title_counts: Dict[str,int] = {}
    for t in job_titles: title_counts[t] = title_counts.get(t,0)+1
    top_job_titles = [{"title": t, "count": n} for t,n in sorted(title_counts.items(), key=lambda x: x[1], reverse=True)[:5]]

    return {
        "totalApplications": len(apps),
        "statusBreakdown": status_breakdown,
        "applicationsByMonth": applications_by_month,
        "topJobTitles": top_job_titles,
        "uniqueCompanies": len(set(company_names)),
    }

def calculate_interview_metrics(stages: List[StageLiteDTO], apps: List[ApplicationLiteDTO]) -> Dict[str, Any]:
    interview_stages = [s for s in stages if any(k in (s.name or "").lower() for k in ['interview','phone screen','tech','onsite','on-site'])]
    interview_types: Dict[str,int] = {}
    for s in interview_stages:
        name = (s.name or "").lower()
        t = "Other"
        if "phone" in name: t = "Phone Screen"
        elif "tech" in name: t = "Technical"
        elif "onsite" in name or "on-site" in name: t = "On-site"
        elif "behavioral" in name: t = "Behavioral"
        elif "final" in name: t = "Final"
        interview_types[t] = interview_types.get(t,0)+1
    interview_type_breakdown = [{"type": k, "count": v} for k,v in interview_types.items()]
    successful = len([s for s in interview_stages if (s.outcome or "").lower() in ["passed","success","positive"]])
    success_rate = (successful/len(interview_stages)*100) if interview_stages else 0
    apps_with_int = len(set(s.application_id for s in interview_stages))
    interview_conversion_rate = (apps_with_int/len(apps)*100) if apps else 0
    avg_per_app = len(interview_stages)/len(apps) if apps else 0
    outcomes: Dict[str,int] = {}
    for s in interview_stages:
        oc = s.outcome or "Pending"
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

def calculate_company_metrics(apps: List[ApplicationLiteDTO], jobs: Dict[str, JobLiteDTO], companies: Dict[str, CompanyLiteDTO]) -> Dict[str, Any]:
    # aggregate per company
    comp_data: Dict[str, Dict] = {}
    for a in apps:
        j = jobs.get(a.job_id)
        if not j or not j.company_id: continue
        c = companies.get(j.company_id)
        if not c: continue
        d = comp_data.setdefault(c.name, {"applications": 0, "interviews": 0, "offers": 0, "company_id": c.id})
        d["applications"] += 1
    # interviews/offers per company by looking at app ids belonging to company
    from collections import defaultdict
    # Note: for interview/offer rates we rely on stage metrics computed outside; caller can’t pass stages per company here
    # keep it simple: zero them now; UI still benefits from counts
    top = sorted(comp_data.items(), key=lambda kv: kv[1]["applications"], reverse=True)[:10]
    top_list = [{
        "name": name,
        "applications": d["applications"],
        "interviews": d.get("interviews", 0),
        "offers": d.get("offers", 0),
        "interview_rate": round((d.get("interviews",0)/d["applications"])*100,1) if d["applications"] else 0,
        "offer_rate": round((d.get("offers",0)/d["applications"])*100,1) if d["applications"] else 0,
    } for name, d in top]
    # lightweight placeholder for size distribution
    sizes = [
        {"size": "Startup (1-50)", "count": len([n for n in comp_data if len(n) < 10])},
        {"size": "Medium (51-500)", "count": len([n for n in comp_data if 10 <= len(n) < 20])},
        {"size": "Large (500+)", "count": len([n for n in comp_data if len(n) >= 20])},
    ]
    return {
        "totalCompanies": len(comp_data),
        "topCompanies": top_list,
        "avgApplicationsPerCompany": round(len(apps)/len(comp_data),1) if comp_data else 0,
        "companySizeDistribution": sizes,
    }

def calculate_timeline_metrics(apps: List[ApplicationLiteDTO], stages: List[StageLiteDTO]) -> Dict[str, Any]:
    process_durations, stage_durations = [], []
    app_stages_map: Dict[str, List[StageLiteDTO]] = {}
    for s in stages: app_stages_map.setdefault(s.application_id, []).append(s)
    for a in apps:
        st = sorted(app_stages_map.get(a.id, []), key=lambda x: x.created_at)
        if not st: continue
        final = st[-1]; process_durations.append((final.created_at - a.created_at).days)
        for i in range(1, len(st)):
            gap = (st[i].created_at - st[i-1].created_at).days
            stage_durations.append({"from_stage": st[i-1].name, "to_stage": st[i].name, "duration": gap})
    avg_proc = sum(process_durations)/len(process_durations) if process_durations else 0
    stage_avg: Dict[str, list] = {}
    for d in stage_durations:
        key = f"{d['from_stage']} → {d['to_stage']}"
        stage_avg.setdefault(key, []).append(d["duration"])
    transitions = [{"transition": k, "avg_days": round(sum(v)/len(v),1), "count": len(v)} for k,v in stage_avg.items() if len(v) >= 2]

    # weekly trends (last 12)
    weekly = {}
    for a in apps:
        k = a.created_at.strftime("%Y-W%W")
        weekly[k] = weekly.get(k, 0) + 1
    weekly_data = [{"week": wk, "applications": cnt} for wk, cnt in sorted(weekly.items())[-12:]]

    # bottlenecks: avg “time since updated” per status
    from datetime import datetime as _dt, timezone as _tz
    now = _dt.now(_tz.utc)
    status_durations: Dict[str, list] = {}
    for a in apps:
        status_durations.setdefault(a.status, []).append((now - a.updated_at).days)
    bottlenecks = []
    for status, arr in status_durations.items():
        if len(arr) >= 2:
            avg = sum(arr)/len(arr)
            if avg > 14:
                bottlenecks.append({"stage": status, "avg_duration_days": round(avg,1), "applications_count": len(arr)})
    return {
        "avgProcessDuration": round(avg_proc,1),
        "stageTransitions": transitions,
        "weeklyApplicationTrends": weekly_data,
        "bottlenecks": bottlenecks,
        "totalProcesses": len(process_durations),
    }
