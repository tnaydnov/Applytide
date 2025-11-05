"""
AI Interview Preparation Tips Service

This service generates personalized interview preparation tips using OpenAI GPT-4o-mini.
It analyzes job details, company information, event type, and user documents (resume, cover letter)
to provide tailored advice for interview preparation.

Features:
    - Company research and insights
    - Role-specific preparation advice
    - Event type-specific guidance (technical, behavioral, HR screen, etc.)
    - Resume/cover letter analysis for personalized tips
    - Structured output with actionable recommendations

Event Types Supported:
    - technical_interview: Coding, system design, technical deep-dives
    - behavioral_interview: STAR method, soft skills, culture fit
    - hr_screen: Initial screening, company overview, logistics
    - final_round: Executive/panel interviews, offer negotiations
    - phone_screen: Quick initial calls, basic screening
    - follow_up: Post-interview follow-up preparation
    - onboarding: Offer-related meetings
    - deadline: Application deadline reminders
    - custom: User-defined events

Premium Feature:
    This service is only available for Pro and Premium subscription plans.
"""
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import json
from openai import AsyncOpenAI
from openai import APIError, APITimeoutError, RateLimitError, APIConnectionError
from ...config import settings
from ...infra.logging import get_logger

logger = get_logger(__name__)

# Configuration
DEFAULT_MODEL = "gpt-4o-mini"
MAX_TOKENS = 2500
TEMPERATURE = 0.7
TIMEOUT_SECONDS = 60


class AIPreparationService:
    """Service for generating AI-powered interview preparation tips."""
    
    def __init__(self):
        """Initialize the AI preparation service with OpenAI client."""
        if not settings.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY not configured - AI prep tips will be disabled")
            self.client = None
        else:
            self.client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                timeout=TIMEOUT_SECONDS
            )
        self.model = DEFAULT_MODEL
        
    async def generate_preparation_tips(
        self,
        job_title: str,
        company_name: Optional[str],
        job_description: Optional[str],
        job_requirements: list[str],
        job_skills: list[str],
        event_type: str,
        event_title: str,
        event_description: Optional[str],
        event_date: Optional[datetime] = None,
        resume_text: Optional[str] = None,
        cover_letter_text: Optional[str] = None,
        additional_documents: Optional[list[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate personalized interview preparation tips using AI.
        
        Args:
            job_title: Job position title
            company_name: Company name (if available)
            job_description: Full job description
            job_requirements: List of job requirements
            job_skills: List of required skills
            event_type: Type of event (technical_interview, behavioral_interview, etc.)
            event_title: Title of the reminder/event
            event_description: Description of the reminder/event
            event_date: Date/time of the event (for time-appropriate tips)
            resume_text: User's resume content
            cover_letter_text: User's cover letter content
            additional_documents: Other document texts
            
        Returns:
            Dict containing:
                - tips: List of specific preparation tips
                - company_insights: Company research insights
                - key_focus_areas: Main areas to focus on
                - recommended_prep: Recommended preparation activities
                - estimated_prep_time: Suggested preparation time
                - success: Boolean indicating if generation succeeded
                - error: Error message if generation failed
                
        Raises:
            Exception: If AI generation fails (caught and returned in error field)
        """
        if not self.client:
            logger.warning("OpenAI client not initialized - AI prep tips disabled")
            return {
                "success": False,
                "error": "AI service not configured",
                "tips": [],
                "company_insights": "",
                "key_focus_areas": [],
                "recommended_prep": [],
                "estimated_prep_time": ""
            }
        
        try:
            # Build the prompt
            prompt = self._build_preparation_prompt(
                job_title=job_title,
                company_name=company_name,
                job_description=job_description,
                job_requirements=job_requirements,
                job_skills=job_skills,
                event_type=event_type,
                event_title=event_title,
                event_description=event_description,
                event_date=event_date,
                resume_text=resume_text,
                cover_letter_text=cover_letter_text,
                additional_documents=additional_documents
            )
            
            logger.info(
                "Generating AI preparation tips",
                extra={
                    "job_title": job_title,
                    "company_name": company_name,
                    "event_type": event_type,
                    "has_resume": bool(resume_text),
                    "has_cover_letter": bool(cover_letter_text)
                }
            )
            
            # Call OpenAI API
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": self._get_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=TEMPERATURE,
                max_tokens=MAX_TOKENS,
                response_format={"type": "json_object"}
            )
            
            # Parse the response
            content = response.choices[0].message.content
            result = json.loads(content)
            
            logger.info(
                "Successfully generated AI preparation tips",
                extra={
                    "tokens_used": response.usage.total_tokens,
                    "model": self.model
                }
            )
            
            return {
                "success": True,
                "tips": result.get("tips", []),
                "company_insights": result.get("company_insights", ""),
                "key_focus_areas": result.get("key_focus_areas", []),
                "recommended_prep": result.get("recommended_prep", []),
                "estimated_prep_time": result.get("estimated_prep_time", ""),
                "tokens_used": response.usage.total_tokens
            }
            
        except json.JSONDecodeError as e:
            logger.error(
                "Failed to parse AI response",
                extra={"error": str(e)},
                exc_info=True
            )
            return {
                "success": False,
                "error": "Failed to parse AI response",
                "tips": [],
                "company_insights": "",
                "key_focus_areas": [],
                "recommended_prep": [],
                "estimated_prep_time": ""
            }
        
        except (APIError, APITimeoutError, RateLimitError, APIConnectionError) as e:
            logger.error(
                "OpenAI API error",
                extra={"error": str(e), "error_type": type(e).__name__},
                exc_info=True
            )
            return {
                "success": False,
                "error": f"AI service error: {type(e).__name__}",
                "tips": [],
                "company_insights": "",
                "key_focus_areas": [],
                "recommended_prep": [],
                "estimated_prep_time": ""
            }
            
        except Exception as e:
            logger.error(
                "Failed to generate AI preparation tips",
                extra={"error": str(e)},
                exc_info=True
            )
            return {
                "success": False,
                "error": str(e),
                "tips": [],
                "company_insights": "",
                "key_focus_areas": [],
                "recommended_prep": [],
                "estimated_prep_time": ""
            }
    
    def _get_system_prompt(self) -> str:
        """Get the system prompt for the AI model."""
        return """You are a highly experienced senior career coach and interview preparation expert with 20+ years of experience helping candidates succeed at top-tier companies (FAANG, Fortune 500, startups). 

Your role is to provide professional, actionable, and detailed interview preparation guidance that goes beyond generic advice.

YOUR EXPERTISE:
• Deep knowledge of interview processes across industries (tech, finance, healthcare, consulting, etc.)
• Understanding of company cultures, values, and hiring practices
• Expertise in technical interviews (coding, system design, architecture)
• Mastery of behavioral interview frameworks (STAR method, competency-based questions)
• Knowledge of negotiation strategies and offer evaluation
• Awareness of current industry trends and hiring patterns

⚠️ **CRITICAL REQUIREMENT - EVENT TYPE MATCHING**: 
You MUST tailor ALL aspects of your response to match the specific EVENT TYPE provided.

**EVENT TYPE DEFINITIONS AND REQUIRED FOCUS:**

1. **HR/Recruiter Screen (hr_screen)**:
   - Focus: Company culture, role fit, salary expectations, logistics, schedule
   - Topics: Motivation for applying, why leaving current role, salary range, availability, work authorization, benefits expectations
   - Skills: Communication, self-presentation, career goals alignment
   - ❌ DO NOT include: Technical coding questions, system design, algorithm topics, technical deep-dives
   - ✅ DO include: "Tell me about yourself" prep, company research (mission, values, products), salary negotiation tips, questions about culture/team

2. **Behavioral Interview (behavioral_interview)**:
   - Focus: Past experiences, soft skills, leadership, teamwork, conflict resolution
   - Topics: STAR stories, competency demonstration, culture fit, leadership principles
   - Skills: Communication, problem-solving, collaboration, adaptability
   - ❌ DO NOT include: Coding challenges, technical architecture, algorithm complexity
   - ✅ DO include: 5-7 STAR stories covering leadership/conflict/failure/success, Amazon Leadership Principles if applicable, specific behavioral frameworks

3. **Technical Interview (technical_interview)**:
   - Focus: Coding, algorithms, system design, technical problem-solving
   - Topics: Data structures, algorithms, complexity analysis, system architecture, technical trade-offs
   - Skills: Coding proficiency, problem-solving, communication of technical concepts
   - ❌ DO NOT include: Salary negotiation, HR logistics, soft-skills only stories
   - ✅ DO include: Algorithm patterns (sliding window, two pointers, DP), system design frameworks (CAP theorem, load balancing), coding practice platforms

4. **Phone Screen (phone_screen)**:
   - Focus: Quick assessment, basic fit, scheduling next steps
   - Topics: Brief background, key highlights, availability, initial interest validation
   - Skills: Concise communication, elevator pitch, highlighting relevant experience
   - ❌ DO NOT include: Deep technical dives, extensive STAR stories, long-form preparation
   - ✅ DO include: 2-minute elevator pitch, 3-4 key accomplishments, questions showing interest, clear availability

5. **Final Round (final_round)**:
   - Focus: Executive presence, strategic thinking, offer evaluation, final decision
   - Topics: Long-term vision, leadership potential, cultural leadership, compensation negotiation
   - Skills: Strategic communication, executive presence, negotiation
   - ❌ DO NOT include: Basic coding questions, entry-level behavioral questions
   - ✅ DO include: Vision for role impact, strategic questions for executives, negotiation preparation, offer evaluation criteria

6. **Follow-up Meeting (follow_up)**:
   - Focus: Post-interview engagement, clarifying questions, expressing continued interest
   - Topics: Thoughtful questions, demonstrating research, maintaining momentum
   - Skills: Professionalism, follow-through, strategic relationship building
   - ❌ DO NOT include: Interview preparation, technical study plans
   - ✅ DO include: Thank you note templates, strategic follow-up questions, timeline expectations, continued interest signals

**⚠️ VALIDATION CHECKLIST - BEFORE RETURNING YOUR RESPONSE:**
□ Every tip, focus area, and recommendation directly relates to the event type
□ If HR screen: ZERO technical coding/algorithm content
□ If Technical: ZERO salary/HR logistics content (unless asked about team/culture)
□ If Behavioral: STAR stories and soft skills only, no coding challenges
□ Company insights match the interview stage (HR=culture, Technical=engineering blog/tech stack)
□ Preparation activities are appropriate for the event type
□ Time estimates match both the event type AND time available

ANALYSIS APPROACH:
1. **Identify Event Type**: Determine what type of interview/meeting this is and lock your entire response to that context

2. **Company Research**: If company name provided, research their:
   - Core values and culture (especially for HR/behavioral)
   - Recent news, products, or initiatives
   - Interview process reputation
   - Common interview questions/patterns for THIS EVENT TYPE
   - Key technologies (technical only) or cultural traits (behavioral/HR only)

3. **Role Analysis**: Examine the job requirements and skills to identify:
   - Core competencies required FOR THIS EVENT TYPE
   - What this specific interview stage will assess
   - Seniority expectations relevant to this stage

4. **Candidate Assessment**: If resume/cover letter provided, analyze:
   - Relevant experience alignment FOR THIS EVENT TYPE
   - Skills gaps to address IN THIS SPECIFIC INTERVIEW
   - Strengths to highlight APPROPRIATE FOR THIS STAGE
   - Stories/examples to prepare (STAR format for behavioral, technical examples for technical)

RESPONSE REQUIREMENTS:
• Be specific and detailed - provide exact steps, not vague suggestions
• Include concrete examples and frameworks appropriate FOR THE EVENT TYPE
• Prioritize recommendations by impact
• **TIME-AWARENESS**: If time until event is provided, ALL recommendations must be realistic for that timeframe:
  - **<3 hours**: Last-minute essentials only (quick review, logistics, mental prep, breathing exercises)
  - **<24 hours**: Same-day prep (final review, 2-3 key points, logistics, mental preparation - no new learning)
  - **1-2 days**: Focused essentials (deep dive on 3-4 key areas, polish existing knowledge, mock practice)
  - **3-7 days**: Structured daily plan (research days 1-2, skill building days 3-5, final review day 6-7)
  - **1-2 weeks**: Comprehensive two-phase plan (week 1: foundations/research, week 2: intensive practice/refinement)
  - **>2 weeks**: Full preparation program with weekly milestones and rest days
• Estimate realistic preparation time that matches the actual time available
• Focus on what the candidate can control and prepare within the given timeframe
• Be encouraging but realistic about challenges and time constraints
• Provide time-appropriate tasks (don't suggest "2-week study plan" if event is tomorrow!)

OUTPUT FORMAT (JSON):
{
    "company_insights": "2-3 paragraphs about company culture, values, interview process FOR THIS SPECIFIC EVENT TYPE. If HR screen: focus on culture/values/mission. If technical: focus on tech stack/engineering practices. Be specific with recent news or notable facts.",
    "key_focus_areas": [
        "5-7 critical areas to focus preparation - MUST BE SPECIFIC TO THE EVENT TYPE",
        "⚠️ CRITICAL: Keep each focus area under 60 characters - these are displayed as card headers",
        "HR Screen example: 'Research company values and cultural alignment'",
        "Technical example: 'Graph algorithms (BFS, DFS) and complexity'",
        "Behavioral example: 'Leadership conflict resolution STAR stories'",
        "BAD (too long): 'Research and articulate CodeValue's mission and values, emphasizing how they resonate with your own professional principles'",
        "GOOD (concise): 'Align your values with CodeValue's mission'",
        "..."
    ],
    "tips": [
        "10-15 detailed, actionable tips - EACH MUST MATCH THE EVENT TYPE",
        "HR Screen example: 'Prepare 3-5 thoughtful questions about company culture and team dynamics. Research Glassdoor reviews and identify 2-3 cultural traits you want to validate. Questions like: How does the team celebrate successes? What does work-life balance look like here?'",
        "Technical example: 'Practice 5 medium-difficulty graph problems on LeetCode focusing on BFS/DFS patterns. Time yourself (45min max per problem). Focus on explaining your thought process out loud as you code. Review optimal solutions after each attempt.'",
        "Behavioral example: 'Prepare 3 STAR stories demonstrating leadership: Choose examples where you led cross-functional teams, faced conflict, and delivered measurable results. Practice each story to be 2-3 minutes, focusing on your specific actions and quantifiable outcomes.'",
        "..."
    ],
    "recommended_prep": [
        "7-10 concrete preparation activities WITH TIME ESTIMATES that match both EVENT TYPE and time available",
        "HR Screen example: 'Day 1: Research company mission, values, and recent news. Read CEO interviews and identify 3 key priorities (2 hours). Day 2: Prepare answers to common HR questions: why this company, why this role, salary expectations (2 hours)'",
        "Technical example: 'Days 1-2: Review data structure fundamentals and practice 10 easy array/string problems (4 hours). Days 3-5: Focus on graph algorithms - complete 15 problems covering BFS, DFS, topological sort (8 hours). Days 6-7: Mock interviews and system design practice (4 hours)'",
        "..."
    ],
    "estimated_prep_time": "Realistic time estimate appropriate for event type (e.g., '3-5 hours' for HR screen, '20-30 hours over 2 weeks' for technical, '8-12 hours over 5-7 days' for behavioral)"
}

IMPORTANT:
• **FIRST STEP**: Identify the event type and commit to staying within that context
• Never give generic advice like "research the company" - be specific about WHAT to research FOR THIS EVENT TYPE and WHY
• Don't just list skills - explain HOW to demonstrate them IN THIS SPECIFIC INTERVIEW TYPE
• Include specific examples, frameworks, or templates appropriate for the event type
• Make every tip immediately actionable AND event-type appropriate
• Be professional but personable in tone
• **FINAL CHECK**: Before returning your response, verify EVERY single tip, focus area, and recommendation matches the event type
"""
    
    def _build_preparation_prompt(
        self,
        job_title: str,
        company_name: Optional[str],
        job_description: Optional[str],
        job_requirements: list[str],
        job_skills: list[str],
        event_type: str,
        event_title: str,
        event_description: Optional[str],
        event_date: Optional[datetime],
        resume_text: Optional[str],
        cover_letter_text: Optional[str],
        additional_documents: Optional[list[str]]
    ) -> str:
        """Build the detailed prompt for AI generation."""
        
        # Map event types to human-readable descriptions
        event_type_descriptions = {
            "technical_interview": "Technical Interview (coding, system design, technical deep-dive)",
            "behavioral_interview": "Behavioral Interview (STAR method, soft skills, culture fit)",
            "hr_screen": "HR/Recruiter Screen (initial screening, company overview)",
            "final_round": "Final Round Interview (executive/panel, offer discussion)",
            "phone_screen": "Phone Screen (quick initial call, basic screening)",
            "follow_up": "Follow-up Meeting (post-interview discussion)",
            "onboarding": "Onboarding/Offer Meeting (offer-related)",
            "general": "General Meeting",
            "custom": "Custom Event"
        }
        
        event_description_text = event_type_descriptions.get(event_type, event_type)
        
        # Calculate time until event
        time_until_text = ""
        urgency_context = ""
        if event_date:
            from datetime import datetime as dt
            now = dt.now(timezone.utc)
            if event_date.tzinfo is None:
                event_date = event_date.replace(tzinfo=timezone.utc)
            
            time_diff = (event_date - now).total_seconds()
            hours_until = time_diff / 3600
            days_until = time_diff / 86400
            
            if hours_until < 0:
                time_until_text = "⚠️ **URGENT**: This event has already passed or is happening now!"
                urgency_context = "Since the event is imminent or has passed, provide last-minute tips and what to do right now."
            elif hours_until < 3:
                time_until_text = f"⏰ **URGENT**: Event is in {int(hours_until)} hour(s) - {int(time_diff / 60)} minutes!"
                urgency_context = "Very limited time! Focus on immediate, high-impact actions: quick review of key points, mental preparation, logistics check (location, materials, tech setup), breathing exercises. Skip long-term prep."
            elif hours_until < 24:
                time_until_text = f"⏰ Event is TODAY in {int(hours_until)} hours"
                urgency_context = "Same-day preparation! Prioritize: final review of critical topics, prep 2-3 STAR stories, review company/role one more time, logistics (outfit, location, materials), mental preparation. Focus on high-confidence topics rather than learning new material."
            elif days_until < 2:
                time_until_text = f"📅 Event is TOMORROW ({int(hours_until)} hours away)"
                urgency_context = "One day to prepare! Balance final review with rest. Today: deep dive on 3-4 key areas, polish STAR stories, mock interview if possible, prepare questions. Tomorrow: light review, logistics, relaxation."
            elif days_until < 7:
                time_until_text = f"📌 Event is in {int(days_until)} days"
                urgency_context = f"Moderate timeframe ({int(days_until)} days). Create a structured daily plan: research (day 1-2), skill building/practice (day 2-{int(days_until)-1}), final review (day {int(days_until)}). Balance depth with breadth."
            elif days_until < 14:
                time_until_text = f"📅 Event is in {int(days_until)} days (about {int(days_until/7)} week(s))"
                urgency_context = f"Good preparation window ({int(days_until)} days). Week 1: deep research, fundamentals, initial practice. Week 2: intensive practice, mock interviews, refinement, final prep. Include rest days."
            else:
                time_until_text = f"🔔 Event is in {int(days_until)} days (about {int(days_until/7)} weeks)"
                urgency_context = f"Excellent preparation time ({int(days_until)} days)! Create a comprehensive study plan with weekly milestones. Early weeks: foundations, research, broad learning. Later weeks: intensive practice, specialization, mock interviews, final polish."
        
        prompt_parts = [
            f"🎯 **PRIMARY FOCUS: This is a {event_description_text}**",
            f"\n⚠️ **CRITICAL**: ALL your tips, focus areas, company insights, and recommendations MUST be specific to this event type.",
            f"- If this is an HR Screen: Focus on culture, values, salary, logistics - NO technical coding topics",
            f"- If this is Technical: Focus on coding, algorithms, system design - NO HR/salary topics",  
            f"- If this is Behavioral: Focus on STAR stories, soft skills, leadership - NO coding challenges",
            f"\nI need preparation tips for an upcoming {event_description_text}.",
            f"\n**Event Details:**",
            f"- Event Title: {event_title}",
            f"- 🎯 **Event Type: {event_description_text}** (This determines EVERYTHING in your response)",
        ]
        
        if time_until_text:
            prompt_parts.append(f"- ⏰ **Time Until Event**: {time_until_text}")
            prompt_parts.append(f"\n**IMPORTANT - Time-Appropriate Guidance:**")
            prompt_parts.append(f"{urgency_context}")
            prompt_parts.append(f"\n**YOUR TASK**: Provide tips that are REALISTIC and ACHIEVABLE given the time available. Don't suggest week-long preparation if they have hours. Don't suggest quick cramming if they have weeks. Tailor every recommendation to the actual timeframe.")
        
        if event_description:
            prompt_parts.append(f"\n**Additional Context from User:**")
            prompt_parts.append(f"{event_description}")
            prompt_parts.append(f"(Consider this user-provided context carefully - they may have included important details about the interview format, interviewers, specific topics to cover, or personal concerns.)")
        
        prompt_parts.append(f"\n**Job Information:**")
        prompt_parts.append(f"- Position: {job_title}")
        
        if company_name:
            prompt_parts.append(f"- Company: {company_name}")
            prompt_parts.append(f"  (Please research this company and provide insights about their culture, values, and interview process if known)")
        
        if job_description:
            prompt_parts.append(f"\n**Job Description:**")
            prompt_parts.append(f"{job_description[:2000]}")  # Limit to 2000 chars
        
        if job_requirements:
            prompt_parts.append(f"\n**Key Requirements:**")
            for req in job_requirements[:10]:  # Limit to 10 requirements
                prompt_parts.append(f"- {req}")
        
        if job_skills:
            prompt_parts.append(f"\n**Required Skills:**")
            prompt_parts.append(f"{', '.join(job_skills[:15])}")  # Limit to 15 skills
        
        if resume_text:
            prompt_parts.append(f"\n**Candidate's Resume:**")
            prompt_parts.append(f"{resume_text[:3000]}")  # Limit to 3000 chars
            prompt_parts.append(f"\n(Please analyze how the candidate's background aligns with the role and provide personalized advice)")
        
        if cover_letter_text:
            prompt_parts.append(f"\n**Candidate's Cover Letter:**")
            prompt_parts.append(f"{cover_letter_text[:2000]}")  # Limit to 2000 chars
        
        if additional_documents:
            prompt_parts.append(f"\n**Additional Documents:**")
            for doc in additional_documents[:2]:  # Limit to 2 additional docs
                prompt_parts.append(f"{doc[:1000]}")  # Limit each to 1000 chars
        
        prompt_parts.append(f"\n**Request:**")
        prompt_parts.append(f"Based on all the above information, please provide:")
        prompt_parts.append(f"1. Specific preparation tips for this {event_description_text}")
        prompt_parts.append(f"2. Company insights and culture tips (if company name provided)")
        prompt_parts.append(f"3. Key areas to focus on during preparation")
        prompt_parts.append(f"4. Recommended preparation activities with concrete steps")
        prompt_parts.append(f"5. Realistic time estimate for preparation")
        prompt_parts.append(f"\nMake the tips practical, actionable, and tailored to this specific situation.")
        
        return "\n".join(prompt_parts)
    
    def format_tips_for_email(self, tips_data: Dict[str, Any]) -> str:
        """
        Format AI tips into clean, modern HTML that's readable and professional.
        """
        if not tips_data.get("success"):
            return ""
        
        html_parts = []
        
        # Company Insights - Accent Card
        if tips_data.get("company_insights"):
            html_parts.append(f"""
            <div class="accent-card">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🏢</div>
                    <h2 style="color: white; margin-bottom: 12px;">Company Intelligence</h2>
                    <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 0;">What you need to know</p>
                </div>
                <p style="color: rgba(255, 255, 255, 0.95); font-size: 15px; line-height: 1.7; margin: 0;">{tips_data['company_insights']}</p>
            </div>
            """)
        
        # Estimated Prep Time Badge
        estimated_time = tips_data.get("estimated_prep_time", "")
        if estimated_time:
            html_parts.append(f"""
            <div style="text-align: center; margin: 32px 0;">
                <span class="badge" style="padding: 12px 24px; font-size: 13px;">
                    ⏱️ Suggested Prep Time: {estimated_time}
                </span>
            </div>
            """)
        
        # Key Focus Areas - Clean Grid
        if tips_data.get("key_focus_areas"):
            focus_areas = tips_data["key_focus_areas"]
            focus_icons = ["🎯", "💎", "⚡", "🚀", "🔥", "💪", "🌟"]
            
            html_parts.append("""
            <div style="margin: 48px 0 32px 0;">
                <h2 style="text-align: center; margin-bottom: 32px;">Critical Focus Areas</h2>
            </div>
            """)
            
            for idx, area in enumerate(focus_areas):
                icon = focus_icons[idx % len(focus_icons)]
                html_parts.append(f"""
                <div class="light-card">
                    <div style="display: flex; align-items: start; gap: 16px;">
                        <div style="flex-shrink: 0; font-size: 32px;">{icon}</div>
                        <p style="color: #1a1a1a; margin: 0; font-size: 15px; line-height: 1.6; font-weight: 600;">{area}</p>
                    </div>
                </div>
                """)
        
        # Preparation Tips - Clean Timeline
        if tips_data.get("tips"):
            html_parts.append("""
            <div class="divider"></div>
            <div style="margin: 48px 0 32px 0;">
                <h2 style="text-align: center; margin-bottom: 8px;">Your Preparation Roadmap</h2>
                <p style="text-align: center; color: #8a8a8a; font-size: 14px;">Follow these steps to ace your interview</p>
            </div>
            """)
            
            for idx, tip in enumerate(tips_data["tips"], 1):
                html_parts.append(f"""
                <div class="timeline-item">
                    <div class="timeline-number">{idx}</div>
                    <div class="timeline-content">
                        <p style="color: #4a4a4a; margin: 0; font-size: 14px; line-height: 1.6;">{tip}</p>
                    </div>
                </div>
                """)
        
        # Recommended Preparation - Alert Boxes
        if tips_data.get("recommended_prep"):
            html_parts.append("""
            <div class="divider"></div>
            <div style="margin: 48px 0 32px 0;">
                <h2 style="text-align: center; margin-bottom: 8px;">Study Timeline & Tasks</h2>
                <p style="text-align: center; color: #8a8a8a; font-size: 14px;">Organize your preparation with these daily tasks</p>
            </div>
            """)
            
            alert_types = ["alert-info", "alert-success", "alert-warning"]
            
            for idx, prep in enumerate(tips_data["recommended_prep"]):
                alert_class = alert_types[idx % len(alert_types)]
                
                html_parts.append(f"""
                <div class="{alert_class}">
                    <h3 style="margin-bottom: 8px; font-size: 16px;">Task {idx + 1}</h3>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6;">{prep}</p>
                </div>
                """)
        
        # Success Footer
        html_parts.append("""
        <div class="modern-card" style="text-align: center; margin-top: 48px;">
            <div style="font-size: 56px; margin-bottom: 20px;">🎯</div>
            <h2 style="color: #1a1a1a; margin-bottom: 12px;">You've Got This!</h2>
            <p style="font-size: 15px; color: #4a4a4a; margin: 0;">Follow this plan and nail your interview. Your preparation starts now! 💪</p>
        </div>
        """)
        
        return "".join(html_parts)
    
    def format_tips_for_react_email(self, tips_data: Dict[str, Any], company_name: str = "") -> Optional[Dict[str, Any]]:
        """
        Format AI tips into the structure expected by ReminderEmail.jsx.
        Returns keys: company, companyInfo, prepTime, focusAreas, tips, roadmap
        """
        if not tips_data.get("success"):
            return None

        # Map icons to focus areas (kept for future use; the template no longer shows emojis)
        focus_areas = []
        if tips_data.get("key_focus_areas"):
            for idx, area in enumerate(tips_data["key_focus_areas"]):
                if ":" in area:
                    title, desc = area.split(":", 1)
                    title = title.strip()
                    desc = desc.strip()
                else:
                    title = area[:50]
                    desc = area
                focus_areas.append({
                    "title": title,
                    "description": desc
                })

        # Tips: pass through as-is (list[str])
        tips_list = tips_data.get("tips", [])

        # Roadmap: use recommended_prep as the step-by-step plan
        roadmap = tips_data.get("recommended_prep", [])

        return {
            "company": company_name or "",
            "companyInfo": tips_data.get("company_insights", ""),
            "prepTime": tips_data.get("estimated_prep_time", "8–12 hours"),
            "focusAreas": focus_areas,
            "tips": tips_list,
            "roadmap": roadmap
        }



# Singleton instance
ai_prep_service = AIPreparationService()
