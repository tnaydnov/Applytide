"""
Job Search Analytics Router

This module provides comprehensive analytics endpoints for tracking and analyzing
job search progress, success rates, timelines, and optimization opportunities.

Key Features:
- Multi-dimensional analytics (applications, interviews, companies, timeline)
- Time range filtering (1m, 3m, 6m, 1y, all)
- CSV and PDF export functionality
- Success metrics and conversion rates
- Application trends and patterns
- Best time to apply analysis
- Company comparison data
- Stage transition tracking

Analytics Dimensions:
- Overview: High-level KPIs and trends
- Applications: Status breakdown, monthly trends, top titles
- Interviews: Success rates, types, outcomes, conversion
- Companies: Top employers, application density, size distribution
- Timeline: Process duration, stage transitions, bottlenecks
- Sources: Application source breakdown
- Best Time: Optimal application timing analysis

Dependencies:
- AnalyticsService for data aggregation
- ReportLab for PDF generation
- CSV writer for export

Router: /api/analytics
"""
from __future__ import annotations
import os
import tempfile, csv
from io import BytesIO
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from starlette.background import BackgroundTask

from ...api.deps import get_current_user
from ...db.models import User
from ...domain.analytics.service import AnalyticsService, time_range_start
from ..deps import get_analytics_service
from ...infra.logging import get_logger

router = APIRouter(prefix="/analytics", tags=["analytics"])
logger = get_logger(__name__)


def _cleanup_temp_file(path: str) -> None:
    """Remove a temporary file after the response has been sent."""
    try:
        os.unlink(path)
    except OSError:
        pass

@router.get("")
def get_analytics(
    range_param: str = Query("6m", alias="range"),
    user: User = Depends(get_current_user),
    svc: AnalyticsService = Depends(get_analytics_service),
):
    """
    Get comprehensive job search analytics.
    
    Retrieves multi-dimensional analytics data for user's job search including
    applications, interviews, timeline, companies, and optimization insights.
    
    Query Parameters:
        - range: Time range for analysis (default: "6m")
          Options: "1m", "3m", "6m", "1y", "all"
    
    Args:
        range_param: Time range filter
        user: Authenticated user from dependency injection
        svc: Analytics service from dependency injection
    
    Returns:
        dict: Comprehensive analytics object with sections:
            - overview: KPIs (totals, rates, trends)
            - applications: Status breakdown, monthly trends, top titles
            - interviews: Success rates, types, outcomes, conversion rates
            - companies: Top companies, size distribution, application density
            - timeline: Process duration, stage transitions, bottlenecks
            - sources: Application source breakdown
            - bestTime: Optimal application timing analysis
    
    Raises:
        HTTPException: 500 if analytics calculation fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User only sees their own analytics
        - Automatic user_id filtering
    
    Notes:
        - Data calculated dynamically from database
        - Complex aggregations for multi-dimensional analysis
        - Response time increases with longer ranges
        - "all" range includes entire history
        - Used by frontend analytics dashboard
        - Includes trend analysis and predictions
    
    Example:
        GET /api/analytics?range=6m
        Response:
        {
            "overview": {
                "totalApplications": 45,
                "interviewRate": 22.2,
                "offerRate": 8.9,
                "avgResponseTime": 7.5,
                "statusDistribution": [...]
            },
            "applications": {...},
            "interviews": {...},
            "companies": {...},
            "timeline": {...}
        }
    """
    try:
        logger.debug(
            "User requesting analytics",
            extra={"user_id": str(user.id), "range": range_param},
        )
        result = svc.get_analytics(user_id=user.id, range_param=range_param)
        return result
    except Exception as e:
        logger.error(
            "Error retrieving analytics",
            extra={"user_id": str(user.id), "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics")

@router.get("/export/csv")
def export_analytics_csv(
    range_param: str = Query("6m", alias="range"),
    user: User = Depends(get_current_user),
    svc: AnalyticsService = Depends(get_analytics_service),
):
    """
    Export analytics data as CSV file.
    
    Generates comprehensive CSV export of all analytics dimensions for offline
    analysis, reporting, or archival.
    
    Query Parameters:
        - range: Time range for analysis (default: "6m")
          Options: "1m", "3m", "6m", "1y", "all"
    
    Args:
        range_param: Time range filter
        user: Authenticated user from dependency injection
        svc: Analytics service from dependency injection
    
    Returns:
        FileResponse: CSV file download with all analytics sections
    
    Raises:
        HTTPException: 500 if CSV generation fails
    
    CSV Structure:
        - Section headers separate different analytics dimensions
        - Overview: Key metrics and trends
        - Applications: Status breakdowns, trends, top titles
        - Interviews: Types, outcomes, conversion rates
        - Companies: Top employers, size distribution
        - Timeline: Stage transitions, bottlenecks, weekly trends
        - Sources: Application source breakdown
        - Best Time: Optimal timing by weekday and hour
    
    Security:
        - Requires authentication via get_current_user dependency
        - User only exports their own data
        - Temporary file automatically cleaned up
    
    Notes:
        - Generates temporary file for streaming
        - Filename includes time range: analytics-data-{range}.csv
        - CSV compatible with Excel, Google Sheets, etc.
        - All analytics sections included
        - Suitable for data analysis tools
    
    Example:
        GET /api/analytics/export/csv?range=1y
        Response: CSV file download (analytics-data-1y.csv)
    """
    try:
        logger.info("Generating CSV analytics export", extra={
            "user_id": user.id,
            "range": range_param
        })
        
        data = svc.get_analytics(user_id=user.id, range_param=range_param)
        temp_file = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".csv", newline="")
        
        w = csv.writer(temp_file)

        # Overview
        w.writerow(["Overview"]); w.writerow(["Metric","Value"])
        ov = data.get("overview", {})
        w.writerow(["Total Applications", ov.get("totalApplications", 0)])
        w.writerow(["Interview Rate (%)", ov.get("interviewRate", 0)])
        w.writerow(["Offer Rate (%)", ov.get("offerRate", 0)])
        w.writerow(["Avg Response Time (days)", ov.get("avgResponseTime", 0)])
        w.writerow([])
        w.writerow(["Status Distribution"]); w.writerow(["Status","Count"])
        for item in ov.get("statusDistribution", []): w.writerow([item.get("label",""), item.get("value",0)])
        w.writerow([])
        w.writerow(["Applications Over Time"]); w.writerow(["Date","Count"])
        for item in ov.get("applicationsOverTime", []): w.writerow([item.get("date",""), item.get("count",0)])

        # Applications
        w.writerow([]); w.writerow(["Applications"])
        ap = data.get("applications", {})
        w.writerow(["Total Applications", ap.get("totalApplications", 0)])
        w.writerow(["Unique Companies", ap.get("uniqueCompanies", 0)])
        w.writerow([]); w.writerow(["Status Breakdown"]); w.writerow(["Status","Count","Percentage"])
        for s in ap.get("statusBreakdown", []): w.writerow([s.get("status",""), s.get("count",0), s.get("percentage",0)])
        w.writerow([]); w.writerow(["Applications by Month"]); w.writerow(["Month","Count"])
        for m in ap.get("applicationsByMonth", []): w.writerow([m.get("month",""), m.get("count",0)])
        w.writerow([]); w.writerow(["Top Job Titles"]); w.writerow(["Title","Count"])
        for t in ap.get("topJobTitles", []): w.writerow([t.get("title",""), t.get("count",0)])

        # Interviews
        w.writerow([]); w.writerow(["Interviews"])
        iv = data.get("interviews", {})
        w.writerow(["Total Interviews", iv.get("totalInterviews", 0)])
        w.writerow(["Success Rate (%)", iv.get("successRate", 0)])
        w.writerow(["Avg Interviews/App", iv.get("avgInterviewsPerApp", 0)])
        w.writerow(["Interview → Offer (%)", iv.get("interviewConversionRate", 0)])
        w.writerow([]); w.writerow(["Interview Types"]); w.writerow(["Type","Count"])
        for t in iv.get("interviewTypeBreakdown", []): w.writerow([t.get("type",""), t.get("count",0)])
        w.writerow([]); w.writerow(["Interview Outcomes"]); w.writerow(["Outcome","Count"])
        for o in iv.get("interviewOutcomes", []): w.writerow([o.get("outcome",""), o.get("count",0)])

        # Companies
        w.writerow([]); w.writerow(["Companies"])
        co = data.get("companies", {})
        w.writerow(["Total Companies", co.get("totalCompanies", 0)])
        w.writerow(["Avg Applications/Company", co.get("avgApplicationsPerCompany", 0)])
        w.writerow([]); w.writerow(["Top Companies"]); w.writerow(["Company","Applications","Interviews","Offers"])
        for c in co.get("topCompanies", []): w.writerow([c.get("name",""), c.get("applications",0), c.get("interviews",0), c.get("offers",0)])
        w.writerow([]); w.writerow(["Company Size Distribution"]); w.writerow(["Size","Count"])
        for s in co.get("companySizeDistribution", []): w.writerow([s.get("size",""), s.get("count",0)])

        # Timeline
        w.writerow([]); w.writerow(["Timeline"])
        tl = data.get("timeline", {})
        w.writerow(["Avg Process Days", tl.get("avgProcessDuration", 0)])
        w.writerow(["Total Processes", tl.get("totalProcesses", 0)])
        w.writerow([]); w.writerow(["Stage Transitions (avg days, count)"])
        w.writerow(["Transition","Avg Days","Count"])
        for s in tl.get("stageTransitions", []): w.writerow([s.get("transition",""), s.get("avg_days",0), s.get("count",0)])
        w.writerow([]); w.writerow(["Weekly Application Trends"]); w.writerow(["Week","Applications"])
        for wk in tl.get("weeklyApplicationTrends", []): w.writerow([wk.get("week",""), wk.get("applications",0)])
        w.writerow([]); w.writerow(["Bottlenecks"]); w.writerow(["Stage","Avg Duration (days)","Applications"])
        for b in tl.get("bottlenecks", []): w.writerow([b.get("stage",""), b.get("avg_duration_days",0), b.get("applications_count",0)])

        # Sources
        so = data.get("sources", {})
        if so:
            w.writerow([]); w.writerow(["Sources"]); w.writerow(["Source","Applications"])
            for s in so.get("breakdown", []): w.writerow([s.get("label",""), s.get("value",0)])

        # Best Time
        bt = data.get("bestTime", {})
        if bt:
            w.writerow([]); w.writerow(["Best Time to Apply"])
            if bt.get("bestWindowText"): w.writerow([bt["bestWindowText"]])
            w.writerow([]); w.writerow(["By Weekday"]); w.writerow(["Day","Score"])
            for d in bt.get("byWeekday", []): w.writerow([d.get("label",""), d.get("value",0)])
            w.writerow([]); w.writerow(["By Hour"]); w.writerow(["Hour","Score"])
            for h in bt.get("byHour", []): w.writerow([h.get("label",""), h.get("value",0)])

        temp_file.close()
        
        logger.info("CSV export generated successfully", extra={
            "user_id": user.id,
            "range": range_param
        })
        
        return FileResponse(
            temp_file.name,
            media_type="text/csv",
            filename=f"analytics-data-{range_param}.csv",
            background=BackgroundTask(_cleanup_temp_file, temp_file.name),
        )
    except Exception as e:
        temp_file.close()
        logger.error("Failed to generate CSV export", extra={
            "user_id": user.id,
            "range": range_param,
            "error": str(e)
        }, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate CSV export. Please try again.")

@router.get("/export/pdf")
def export_analytics_pdf(
    range_param: str = Query("6m", alias="range"),
    user: User = Depends(get_current_user),
    svc: AnalyticsService = Depends(get_analytics_service),
):
    """
    Export analytics as formatted PDF report.
    
    Generates professional PDF report with formatted tables, charts, and insights.
    Falls back to text export if PDF generation fails.
    
    Query Parameters:
        - range: Time range for analysis (default: "6m")
          Options: "1m", "3m", "6m", "1y", "all"
    
    Args:
        range_param: Time range filter
        user: Authenticated user from dependency injection
        svc: Analytics service from dependency injection
    
    Returns:
        StreamingResponse: PDF file download or text fallback
    
    Raises:
        HTTPException: 500 if both PDF and fallback fail
    
    PDF Structure:
        - Title page with range
        - Overview section with KPIs
        - Applications breakdown tables
        - Interview analysis tables
        - Company comparison tables
        - Timeline and stage transitions
        - Best time to apply recommendations
        - Formatted tables with headers and styling
    
    Fallback Behavior:
        - If ReportLab fails, generates plain text report
        - Includes basic overview metrics
        - Logs warning and serves fallback automatically
    
    Security:
        - Requires authentication via get_current_user dependency
        - User only exports their own data
        - No data persistence (generated on demand)
    
    Notes:
        - Requires reportlab library for PDF generation
        - Filename includes time range: analytics-report-{range}.pdf
        - Professional formatting with tables and styling
        - Suitable for presentations and reporting
        - Memory-efficient streaming response
        - Fallback ensures export always succeeds
    
    Example:
        GET /api/analytics/export/pdf?range=3m
        Response: PDF file download (analytics-report-3m.pdf)
        Or fallback: Text file (analytics-report-3m.txt)
    """
    try:
        logger.info("Generating PDF analytics export", extra={
            "user_id": user.id,
            "range": range_param
        })
        
        data = svc.get_analytics(user_id=user.id, range_param=range_param)
        from reportlab.lib.pagesizes import LETTER
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib import colors

        buf = BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=LETTER, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
        styles = getSampleStyleSheet(); story = []
        def h(txt): story.append(Paragraph(f"<b>{txt}</b>", styles["Heading3"]))
        def p(txt): story.append(Paragraph(txt, styles["BodyText"]))
        def sp(hh=8): story.append(Spacer(1, hh))
        def table(title, rows):
            if not rows: return
            story.append(Spacer(1, 6))
            t = Table(rows, hAlign="LEFT")
            t.setStyle(TableStyle([
                ("GRID", (0,0), (-1,-1), 0.25, colors.grey),
                ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0,0), (-1,0), colors.whitesmoke),
                ("FONTSIZE", (0,0), (-1,-1), 9),
                ("BOTTOMPADDING", (0,0), (-1,0), 6),
            ]))
            story.append(Paragraph(f"<b>{title}</b>", styles["BodyText"]))
            story.append(t)

        h("Applytide Analytics Report"); p(f"Range: {range_param}"); sp()
        ov = data.get("overview", {})
        table("Overview", [["Metric","Value"],
            ["Total Applications", ov.get("totalApplications",0)],
            ["Interview Rate (%)", ov.get("interviewRate",0)],
            ["Offer Rate (%)", ov.get("offerRate",0)],
            ["Avg Response Time (days)", ov.get("avgResponseTime",0)],
        ])

        ap = data.get("applications", {})
        table("Applications – Status Breakdown", [["Status","Count","%"]] + [
            [s.get("status",""), s.get("count",0), s.get("percentage",0)] for s in ap.get("statusBreakdown", [])
        ])
        table("Applications – By Month", [["Month","Count"]] + [
            [m.get("month",""), m.get("count",0)] for m in ap.get("applicationsByMonth", [])
        ])

        iv = data.get("interviews", {})
        table("Interviews – Types", [["Type","Count"]] + [[t.get("type",""), t.get("count",0)] for t in iv.get("interviewTypeBreakdown", [])])
        table("Interviews – Outcomes", [["Outcome","Count"]] + [[o.get("outcome",""), o.get("count",0)] for o in iv.get("interviewOutcomes", [])])

        co = data.get("companies", {})
        table("Companies – Top", [["Company","Apps","Interviews","Offers"]] + [
            [c.get("name",""), c.get("applications",0), c.get("interviews",0), c.get("offers",0)] for c in co.get("topCompanies", [])
        ])

        tl = data.get("timeline", {})
        table("Timeline – Stage Transitions", [["Transition","Avg Days","Count"]] + [
            [s.get("transition",""), s.get("avg_days",0), s.get("count",0)] for s in tl.get("stageTransitions", [])
        ])

        bt = data.get("bestTime", {})
        if bt:
            sp(6); p(f"<b>Best Time to Apply:</b> {bt.get('bestWindowText','')}")
            table("By Weekday", [["Day","Score"]] + [[d.get("label",""), d.get("value",0)] for d in bt.get("byWeekday", [])])
            table("By Hour", [["Hour","Score"]] + [[h.get("label",""), h.get("value",0)] for h in bt.get("byHour", [])])

        doc.build(story); buf.seek(0)
        
        logger.info("PDF export generated successfully", extra={
            "user_id": user.id,
            "range": range_param
        })
        
        return StreamingResponse(buf, media_type="application/pdf",
                                 headers={"Content-Disposition": f"attachment; filename=analytics-report-{range_param}.pdf"})
    except Exception as e:
        logger.warning("PDF generation failed, falling back to text", extra={
            "user_id": user.id,
            "range": range_param,
            "error": str(e)
        })
        # simple text fallback
        try:
            tmp = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".txt")
            tmp.write("Applytide Analytics Report\n=========================\n\n")
            tmp.write(f"Range: {range_param}\n\n")
            ov = data.get("overview", {})
            tmp.write("Overview:\n")
            tmp.write(f"- Total Applications: {ov.get('totalApplications',0)}\n")
            tmp.write(f"- Interview Rate: {ov.get('interviewRate',0)}%\n")
            tmp.write(f"- Offer Rate: {ov.get('offerRate',0)}%\n")
            tmp.write(f"- Avg Response Time: {ov.get('avgResponseTime',0)} days\n")
            tmp.close()
            
            logger.info("Text fallback export generated", extra={
                "user_id": user.id,
                "range": range_param
            })
            
            return FileResponse(
                tmp.name,
                media_type="text/plain",
                filename=f"analytics-report-{range_param}.txt",
                background=BackgroundTask(_cleanup_temp_file, tmp.name),
            )
        except Exception as fallback_error:
            logger.error("Failed to generate fallback text export", extra={
                "user_id": user.id,
                "range": range_param,
                "error": str(fallback_error)
            }, exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to generate analytics export")
