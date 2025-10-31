"""
Dashboard Insights Generator

Generates personalized, actionable insights for the dashboard based on user's
actual application data, patterns, and performance metrics.

Key Features:
- Real-time insights from user data
- Actionable recommendations
- Performance tracking
- Pattern detection
- Smart prioritization

Example Insights:
- "You have 3 follow-ups overdue - take action now!"
- "Your Tuesday applications get 34% more responses"
- "Tech companies in your pipeline respond 2.1 days faster"
- "You're on track! 4/5 applications this week"
- "Your response rate is 15% above average"
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from uuid import UUID

from .dto import ApplicationLiteDTO, StageLiteDTO
from app.infra.logging import get_logger

logger = get_logger(__name__)


def _get_overdue_count(apps: List[ApplicationLiteDTO]) -> int:
    """Count applications with overdue follow-ups."""
    now = datetime.now(timezone.utc)
    count = 0
    
    for app in apps:
        if not app or not hasattr(app, 'next_action_date') or not app.next_action_date:
            continue
        
        try:
            if app.next_action_date < now:
                count += 1
        except (AttributeError, TypeError):
            continue
    
    return count


def _get_weekday_pattern(apps: List[ApplicationLiteDTO]) -> Dict[str, Any]:
    """Analyze which days of the week get better responses."""
    weekday_stats = {i: {"applied": 0, "responded": 0} for i in range(7)}
    
    for app in apps:
        if not app or not hasattr(app, 'created_at') or not app.created_at:
            continue
        
        try:
            weekday = app.created_at.weekday()
            weekday_stats[weekday]["applied"] += 1
            
            if hasattr(app, 'status') and app.status and app.status.lower() not in ['applied', 'saved']:
                weekday_stats[weekday]["responded"] += 1
        except (AttributeError, TypeError):
            continue
    
    # Find best day
    best_day = None
    best_rate = 0
    
    for day, stats in weekday_stats.items():
        if stats["applied"] >= 3:  # Need at least 3 applications for meaningful data
            rate = (stats["responded"] / stats["applied"]) * 100 if stats["applied"] > 0 else 0
            if rate > best_rate:
                best_rate = rate
                best_day = day
    
    return {
        "day": best_day,
        "rate": round(best_rate, 1),
        "applied": weekday_stats[best_day]["applied"] if best_day is not None else 0
    }


def _get_company_speed_pattern(apps: List[ApplicationLiteDTO], jobs_map: Dict, companies_map: Dict) -> Dict[str, Any]:
    """Analyze which types of companies respond faster."""
    company_times = {}
    
    for app in apps:
        if not app or not hasattr(app, 'job_id'):
            continue
        
        job = jobs_map.get(app.job_id)
        if not job or not job.company_id:
            continue
        
        company = companies_map.get(job.company_id)
        if not company or not hasattr(company, 'name'):
            continue
        
        # Calculate response time
        if hasattr(app, 'created_at') and hasattr(app, 'updated_at') and app.created_at and app.updated_at:
            if hasattr(app, 'status') and app.status and app.status.lower() not in ['applied', 'saved']:
                try:
                    response_days = (app.updated_at - app.created_at).days
                    company_name = company.name or "Unknown"
                    
                    if company_name not in company_times:
                        company_times[company_name] = []
                    company_times[company_name].append(response_days)
                except (AttributeError, TypeError):
                    continue
    
    # Find fastest company type (simple heuristic: tech keywords)
    tech_keywords = ['tech', 'software', 'digital', 'ai', 'data', 'cloud', 'cyber']
    tech_times = []
    other_times = []
    
    for company_name, times in company_times.items():
        avg_time = sum(times) / len(times) if times else 0
        is_tech = any(keyword in company_name.lower() for keyword in tech_keywords)
        
        if is_tech:
            tech_times.extend(times)
        else:
            other_times.extend(times)
    
    if tech_times and other_times and len(tech_times) >= 2 and len(other_times) >= 2:
        tech_avg = sum(tech_times) / len(tech_times)
        other_avg = sum(other_times) / len(other_times)
        diff = other_avg - tech_avg
        
        if diff > 1:  # At least 1 day difference
            return {
                "faster_type": "Tech",
                "difference_days": round(diff, 1),
                "count": len(tech_times)
            }
    
    return None


def _get_weekly_progress(apps: List[ApplicationLiteDTO], weekly_goal: int) -> Dict[str, Any]:
    """Calculate progress toward weekly goal."""
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    
    this_week = 0
    for app in apps:
        if not app or not hasattr(app, 'created_at') or not app.created_at:
            continue
        
        try:
            if app.created_at >= week_start:
                this_week += 1
        except (AttributeError, TypeError):
            continue
    
    return {
        "current": this_week,
        "goal": weekly_goal,
        "percentage": round((this_week / weekly_goal) * 100, 1) if weekly_goal > 0 else 0
    }


def _get_response_rate_trend(apps: List[ApplicationLiteDTO]) -> Dict[str, Any]:
    """Calculate response rate and compare to baseline."""
    total = len(apps)
    if total == 0:
        return None
    
    responded = 0
    for app in apps:
        if not app or not hasattr(app, 'status'):
            continue
        
        if app.status and app.status.lower() not in ['applied', 'saved', 'rejected']:
            responded += 1
    
    rate = (responded / total) * 100 if total > 0 else 0
    
    # Industry baseline is around 20-25%
    baseline = 22.5
    diff = rate - baseline
    
    if abs(diff) >= 5:  # At least 5% difference to be meaningful
        return {
            "rate": round(rate, 1),
            "compared_to_baseline": round(diff, 1),
            "total": total
        }
    
    return None


def generate_dashboard_insights(
    apps: List[ApplicationLiteDTO],
    stages: List[StageLiteDTO],
    jobs_map: Dict,
    companies_map: Dict,
    weekly_goal: int = 5
) -> List[Dict[str, Any]]:
    """
    Generate 3-5 personalized insights for the dashboard.
    
    Args:
        apps: List of user's applications
        stages: List of application stages/events
        jobs_map: Map of job_id to job data
        companies_map: Map of company_id to company data
        weekly_goal: User's weekly application goal
    
    Returns:
        List of insight objects with:
            - text: The insight message
            - type: "warning", "success", "info", "tip"
            - action: Optional action link
            - priority: 1-5 (1 is highest)
    """
    insights = []
    
    try:
        # 1. Check for overdue follow-ups (highest priority)
        overdue_count = _get_overdue_count(apps)
        if overdue_count > 0:
            insights.append({
                "text": f"You have {overdue_count} follow-up{'s' if overdue_count != 1 else ''} overdue - take action now!",
                "type": "warning",
                "action": "/pipeline?filter=overdue",
                "priority": 1
            })
        
        # 2. Weekly goal progress
        progress = _get_weekly_progress(apps, weekly_goal)
        if progress["current"] >= progress["goal"]:
            insights.append({
                "text": f"🎉 Goal crushed! {progress['current']}/{progress['goal']} applications this week",
                "type": "success",
                "priority": 2
            })
        elif progress["current"] > 0:
            remaining = progress["goal"] - progress["current"]
            insights.append({
                "text": f"On track! {progress['current']}/{progress['goal']} applications this week - {remaining} to go",
                "type": "info",
                "priority": 2
            })
        
        # 3. Best weekday pattern
        weekday_pattern = _get_weekday_pattern(apps)
        if weekday_pattern["day"] is not None and weekday_pattern["rate"] > 30:
            day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            insights.append({
                "text": f"Your {day_names[weekday_pattern['day']]} applications get {weekday_pattern['rate']}% more responses",
                "type": "tip",
                "priority": 3
            })
        
        # 4. Company speed pattern
        company_speed = _get_company_speed_pattern(apps, jobs_map, companies_map)
        if company_speed:
            insights.append({
                "text": f"{company_speed['faster_type']} companies respond {company_speed['difference_days']} days faster",
                "type": "tip",
                "priority": 4
            })
        
        # 5. Response rate trend
        response_trend = _get_response_rate_trend(apps)
        if response_trend:
            if response_trend["compared_to_baseline"] > 0:
                insights.append({
                    "text": f"Your response rate ({response_trend['rate']}%) is {abs(response_trend['compared_to_baseline'])}% above average!",
                    "type": "success",
                    "priority": 3
                })
            else:
                insights.append({
                    "text": f"Response rate is {abs(response_trend['compared_to_baseline'])}% below average - try refining your approach",
                    "type": "info",
                    "action": "/analytics",
                    "priority": 4
                })
        
        # Sort by priority and limit to 5
        insights.sort(key=lambda x: x["priority"])
        insights = insights[:5]
        
        # If we have fewer than 3 insights, add generic helpful tips
        if len(insights) < 3:
            generic_tips = [
                {
                    "text": "Tip: Applications submitted on Tuesday-Thursday get 18% more responses",
                    "type": "tip",
                    "priority": 5
                },
                {
                    "text": "Set up reminders to follow up 1 week after applying",
                    "type": "info",
                    "action": "/reminders",
                    "priority": 5
                }
            ]
            
            for tip in generic_tips:
                if len(insights) < 3:
                    insights.append(tip)
        
        logger.debug(
            f"Generated {len(insights)} dashboard insights",
            extra={
                "insight_count": len(insights),
                "apps_analyzed": len(apps)
            }
        )
        
        return insights
        
    except Exception as e:
        logger.error(
            "Failed to generate dashboard insights",
            extra={"error": str(e)},
            exc_info=True
        )
        # Return safe fallback
        return [{
            "text": "Track your applications to unlock personalized insights",
            "type": "info",
            "priority": 5
        }]
