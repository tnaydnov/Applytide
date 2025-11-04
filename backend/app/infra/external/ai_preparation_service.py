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

ANALYSIS APPROACH:
1. **Company Research**: If company name provided, research their:
   - Core values and culture
   - Recent news, products, or initiatives
   - Interview process reputation
   - Common interview questions/patterns
   - Key technologies or methodologies they use

2. **Role Analysis**: Examine the job requirements and skills to identify:
   - Core competencies required
   - Technical vs. soft skills balance
   - Seniority expectations
   - Key challenges in the role

3. **Candidate Assessment**: If resume/cover letter provided, analyze:
   - Relevant experience alignment
   - Skills gaps to address
   - Strengths to highlight
   - Stories/examples to prepare (STAR format)

4. **Event-Specific Preparation**: Tailor advice based on interview type:
   - **Technical**: Coding patterns, system design frameworks, complexity analysis
   - **Behavioral**: STAR stories, leadership principles, culture fit
   - **HR Screen**: Salary expectations, motivations, logistics
   - **Final Round**: Executive presence, strategic thinking, negotiation
   - **Phone Screen**: Concise communication, elevator pitch, key highlights

RESPONSE REQUIREMENTS:
• Be specific and detailed - provide exact steps, not vague suggestions
• Include concrete examples and frameworks (e.g., "Use the STAR method: Situation...")
• Prioritize recommendations by impact
• **TIME-AWARENESS**: If time until event is provided, ALL recommendations must be realistic for that timeframe:
  - **<3 hours**: Last-minute essentials only (quick review, logistics, mental prep, breathing exercises)
  - **<24 hours**: Same-day prep (final review, 2-3 STAR stories, logistics, mental preparation - no new learning)
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
    "company_insights": "2-3 paragraphs about company culture, values, interview process, and what they look for. Be specific with recent news or notable facts.",
    "key_focus_areas": [
        "5-7 critical areas to focus preparation - be specific (e.g., 'Graph traversal algorithms' not 'Data structures')",
        "..."
    ],
    "tips": [
        "10-15 detailed, actionable tips - each should be 2-3 sentences with specific guidance",
        "Example: 'Prepare 3 STAR stories demonstrating leadership: Choose examples where you led cross-functional teams, faced conflict, and delivered measurable results. Practice each story to be 2-3 minutes, focusing on your specific actions and quantifiable outcomes.'",
        "..."
    ],
    "recommended_prep": [
        "7-10 concrete preparation activities with time estimates",
        "Example: 'Day 1-2: Review company's engineering blog and identify 2-3 technical challenges they're solving. Prepare questions about their approach. (2 hours)'",
        "..."
    ],
    "estimated_prep_time": "Realistic time estimate (e.g., '8-12 hours over 5-7 days' or '20-30 hours over 2 weeks')"
}

IMPORTANT:
• Never give generic advice like "research the company" - be specific about WHAT to research and WHY
• Don't just list skills - explain HOW to demonstrate them in the interview
• Include specific examples, frameworks, or templates when possible
• Make every tip immediately actionable
• Be professional but personable in tone
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
            f"I need preparation tips for an upcoming {event_description_text}.",
            f"\n**Event Details:**",
            f"- Event Title: {event_title}",
            f"- Event Type: {event_description_text}",
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
        Format the AI-generated tips into an immersive, full-width visual experience.
        
        Features:
        - Full-width layout that uses 100% of available space
        - Scattered bubble/shape design - NOT a vertical list
        - Proper color contrast for readability
        - Perfectly aligned emojis
        - Organic, non-linear layout
        - Mobile-responsive with fluid grid
        
        Args:
            tips_data: Dictionary containing tips, insights, focus areas, etc.
            
        Returns:
            HTML-formatted string ready for email inclusion
        """
        if not tips_data.get("success"):
            return ""
        
        html_parts = []
        
        # Full-width container with dark background
        html_parts.append("""
        <div style="width: 100%; background: #0a0e1a; padding: 0; margin: 0;">
        """)
        
        # Header with floating time badge
        estimated_time = tips_data.get("estimated_prep_time", "")
        if estimated_time:
            html_parts.append(f"""
            <div style="text-align: center; padding: 40px 20px 30px; background: linear-gradient(180deg, #1a1f35 0%, #0a0e1a 100%);">
                <div style="display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); padding: 16px 36px; border-radius: 60px; box-shadow: 0 12px 40px rgba(168, 85, 247, 0.5); transform: rotate(-2deg);">
                    <span style="color: #ffffff; font-size: 16px; font-weight: 800; letter-spacing: 1px; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                        ⏱️ {estimated_time}
                    </span>
                </div>
            </div>
            """)
        
        # Company Insights - Full-width hero with offset design
        if tips_data.get("company_insights"):
            html_parts.append(f"""
            <div style="width: 100%; padding: 30px 20px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%); position: relative; overflow: hidden;">
                <!-- Decorative circles -->
                <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                <div style="position: absolute; bottom: -30px; left: -30px; width: 150px; height: 150px; background: rgba(255,255,255,0.08); border-radius: 50%;"></div>
                
                <div style="max-width: 1200px; margin: 0 auto; position: relative; z-index: 1;">
                    <div style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 30px; padding: 40px 35px; border: 2px solid rgba(255,255,255,0.2); box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                        <div style="margin-bottom: 20px;">
                            <span style="font-size: 56px; display: inline-block; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">🏢</span>
                        </div>
                        <h3 style="color: #ffffff; margin: 0 0 20px 0; font-size: 28px; font-weight: 800; text-shadow: 0 2px 12px rgba(0,0,0,0.3); letter-spacing: -0.5px;">Company Intelligence</h3>
                        <p style="color: #ffffff; line-height: 1.9; font-size: 16px; margin: 0; text-shadow: 0 1px 4px rgba(0,0,0,0.2);">{tips_data['company_insights']}</p>
                    </div>
                </div>
            </div>
            """)
        
        # Key Focus Areas - Scattered bubble layout (NOT a list!)
        if tips_data.get("key_focus_areas"):
            focus_areas = tips_data["key_focus_areas"]
            
            # Define bubble styles - scattered positions, varied sizes
            bubble_configs = [
                {"color": "#fbbf24", "emoji": "🎯", "size": "large", "x": "5%", "y": "0"},
                {"color": "#60a5fa", "emoji": "💎", "size": "medium", "x": "35%", "y": "50px"},
                {"color": "#a78bfa", "emoji": "⚡", "size": "large", "x": "68%", "y": "20px"},
                {"color": "#34d399", "emoji": "🚀", "size": "small", "x": "15%", "y": "180px"},
                {"color": "#f472b6", "emoji": "🔥", "size": "medium", "x": "50%", "y": "200px"},
                {"color": "#fb923c", "emoji": "💪", "size": "large", "x": "80%", "y": "160px"},
                {"color": "#818cf8", "emoji": "🌟", "size": "medium", "x": "25%", "y": "320px"},
            ]
            
            html_parts.append("""
            <div style="width: 100%; background: #0a0e1a; padding: 50px 20px 400px; position: relative; min-height: 500px;">
                <div style="max-width: 1200px; margin: 0 auto; position: relative;">
                    <h3 style="color: #ffffff; margin: 0 0 60px 0; font-size: 32px; font-weight: 800; text-align: center; background: linear-gradient(135deg, #fbbf24 0%, #f87171 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                        Critical Focus Areas
                    </h3>
            """)
            
            # Create scattered bubbles
            for idx, area in enumerate(focus_areas[:7]):  # Limit to 7 for layout
                config = bubble_configs[idx]
                
                # Size variations
                if config["size"] == "large":
                    width, padding, font_size, emoji_size = "340px", "35px", "15px", "42px"
                elif config["size"] == "medium":
                    width, padding, font_size, emoji_size = "300px", "30px", "14px", "38px"
                else:
                    width, padding, font_size, emoji_size = "280px", "28px", "13px", "34px"
                
                html_parts.append(f"""
                <div style="position: absolute; left: {config['x']}; top: {config['y']}; width: {width}; transform: translate(-50%, 0) rotate({(idx % 3 - 1) * 3}deg);">
                    <div style="background: {config['color']}; border-radius: 25px; padding: {padding}; box-shadow: 0 15px 40px rgba(0,0,0,0.4); border: 3px solid rgba(255,255,255,0.2); transition: transform 0.3s;">
                        <div style="margin-bottom: 15px;">
                            <span style="font-size: {emoji_size}; display: inline-block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">{config['emoji']}</span>
                        </div>
                        <p style="color: #1f2937; margin: 0; font-size: {font_size}; font-weight: 700; line-height: 1.6; text-shadow: 0 1px 2px rgba(255,255,255,0.5);">{area}</p>
                    </div>
                </div>
                """)
            
            html_parts.append("</div></div>")
        
        # Preparation Tips - Diagonal cards layout (break the grid!)
        if tips_data.get("tips"):
            html_parts.append("""
            <div style="width: 100%; background: linear-gradient(180deg, #0a0e1a 0%, #1e1b4b 100%); padding: 60px 20px;">
                <div style="max-width: 1200px; margin: 0 auto;">
                    <h3 style="color: #ffffff; margin: 0 0 50px 0; font-size: 32px; font-weight: 800; text-align: center; background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                        Your Preparation Roadmap
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
            """)
            
            # Gradient colors for cards
            gradients = [
                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
                "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
                "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
            ]
            
            for idx, tip in enumerate(tips_data["tips"][:8]):  # Limit to 8 for grid
                gradient = gradients[idx % len(gradients)]
                rotation = (idx % 3 - 1) * 2  # Slight rotation for organic feel
                
                html_parts.append(f"""
                <div style="transform: rotate({rotation}deg); transition: transform 0.3s;">
                    <div style="background: {gradient}; border-radius: 28px; padding: 35px 30px; box-shadow: 0 20px 50px rgba(0,0,0,0.4); border: 3px solid rgba(255,255,255,0.3); min-height: 180px; display: flex; flex-direction: column;">
                        <div style="margin-bottom: 20px;">
                            <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
                                <span style="color: #ffffff; font-size: 24px; font-weight: 900; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">{idx + 1}</span>
                            </div>
                        </div>
                        <p style="color: #ffffff; margin: 0; font-size: 15px; line-height: 1.7; font-weight: 600; text-shadow: 0 2px 8px rgba(0,0,0,0.3); flex-grow: 1;">{tip}</p>
                    </div>
                </div>
                """)
            
            html_parts.append("</div></div></div>")
        
        # Recommended Preparation - Hexagonal timeline
        if tips_data.get("recommended_prep"):
            html_parts.append("""
            <div style="width: 100%; background: #0f172a; padding: 60px 20px;">
                <div style="max-width: 1200px; margin: 0 auto;">
                    <h3 style="color: #ffffff; margin: 0 0 50px 0; font-size: 32px; font-weight: 800; text-align: center; background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                        Study Timeline & Tasks
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px;">
            """)
            
            # Alternating colors
            colors = [
                {"bg": "#10b981", "text": "#ffffff"},
                {"bg": "#3b82f6", "text": "#ffffff"},
                {"bg": "#8b5cf6", "text": "#ffffff"},
                {"bg": "#ec4899", "text": "#ffffff"},
                {"bg": "#f59e0b", "text": "#ffffff"},
            ]
            
            for idx, prep in enumerate(tips_data["recommended_prep"][:10]):
                color = colors[idx % len(colors)]
                
                html_parts.append(f"""
                <div style="background: {color['bg']}; border-radius: 20px; padding: 30px 25px; box-shadow: 0 12px 35px rgba(0,0,0,0.3); border: 2px solid rgba(255,255,255,0.2); min-height: 140px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 15px; right: 15px; width: 35px; height: 35px; background: rgba(255,255,255,0.25); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                        <span style="color: {color['text']}; font-size: 18px; font-weight: 900;">✓</span>
                    </div>
                    <p style="color: {color['text']}; margin: 0; font-size: 14px; line-height: 1.7; font-weight: 600; text-shadow: 0 2px 6px rgba(0,0,0,0.2); padding-right: 50px;">{prep}</p>
                </div>
                """)
            
            html_parts.append("</div></div></div>")
        
        # Success footer - Full width with confetti effect
        html_parts.append("""
        <div style="width: 100%; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 50px 20px; text-align: center; position: relative; overflow: hidden;">
            <!-- Confetti decorations -->
            <div style="position: absolute; top: 20px; left: 10%; width: 20px; height: 20px; background: #ffffff; opacity: 0.3; border-radius: 50%;"></div>
            <div style="position: absolute; top: 60px; right: 15%; width: 15px; height: 15px; background: #ffffff; opacity: 0.25; border-radius: 50%;"></div>
            <div style="position: absolute; bottom: 30px; left: 20%; width: 18px; height: 18px; background: #ffffff; opacity: 0.2; border-radius: 50%;"></div>
            <div style="position: absolute; bottom: 50px; right: 25%; width: 22px; height: 22px; background: #ffffff; opacity: 0.3; border-radius: 50%;"></div>
            
            <div style="max-width: 800px; margin: 0 auto; position: relative; z-index: 1;">
                <span style="font-size: 64px; display: inline-block; margin-bottom: 20px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));">🎯</span>
                <h3 style="color: #78350f; margin: 0 0 15px 0; font-size: 28px; font-weight: 900; text-shadow: 0 2px 8px rgba(255,255,255,0.5);">You've Got This!</h3>
                <p style="color: #92400e; margin: 0; font-size: 18px; font-weight: 700; line-height: 1.6; text-shadow: 0 1px 4px rgba(255,255,255,0.4);">
                    Follow this plan and nail your interview. 💪
                </p>
            </div>
        </div>
        """)
        
        # Close container
        html_parts.append("</div>")
        
        return "".join(html_parts)


# Singleton instance
ai_prep_service = AIPreparationService()
