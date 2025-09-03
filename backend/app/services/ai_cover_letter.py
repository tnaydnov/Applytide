"""
Real AI-powered cover letter generation using OpenAI GPT-4o-mini
Cost-effective model: ~$0.001-0.003 per cover letter
"""
import os
import openai
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
from ..db import models
import json

class AICoverLetterService:
    def __init__(self):
        # Get OpenAI API key from environment
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        # Initialize OpenAI client
        self.client = openai.OpenAI(api_key=api_key)
    
    async def generate_intelligent_cover_letter(
        self,
        db: Session,
        job_id: str,
        resume_content: str,
        user_profile: dict,
        tone: str = "professional",
        length: str = "medium"
    ) -> dict:
        """
        Generate an intelligent, personalized cover letter using GPT-4
        """
        
        # Get job details with company information
        job_query = db.execute(
            models.select(models.Job, models.Company.name.label('company_name'))
            .join(models.Company, models.Job.company_id == models.Company.id, isouter=True)
            .where(models.Job.id == job_id)
        ).first()
        
        if not job_query:
            raise ValueError("Job not found")
        
        job, company_name = job_query
        
        # Prepare the prompt for GPT-4
        word_count = {
            "short": "200-300",
            "medium": "300-400", 
            "long": "400-500"
        }.get(length, "300-400")
        
        tone_instructions = {
            "professional": "formal and professional",
            "conversational": "warm and conversational while maintaining professionalism",
            "confident": "confident and assertive while remaining respectful",
            "creative": "creative and engaging while staying professional"
        }.get(tone, "professional")
        
        prompt = f"""
        Create a compelling, personalized cover letter based on the following information:
        
        JOB DETAILS:
        - Position: {job.title}
        - Company: {company_name or 'Not specified'}
        - Location: {job.location}
        - Job Description: {job.description[:1000]}...
        
        CANDIDATE INFORMATION:
        - Resume Content: {resume_content[:1500]}...
        - User Profile: {json.dumps(user_profile)}
        
        REQUIREMENTS:
        - Length: {word_count} words
        - Tone: {tone_instructions}
        - Must be personalized to the specific job and company
        - Highlight relevant experience from the resume
        - Show enthusiasm for the role and company
        - Include a strong opening and closing
        - Use specific examples from the resume when possible
        - Address any key requirements mentioned in the job description
        
        Format the response as a complete cover letter ready to send.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert career counselor and professional writer specializing in creating compelling, personalized cover letters that get results."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                max_tokens=800,
                temperature=0.7
            )
            
            cover_letter_text = response.choices[0].message.content.strip()
            
            return {
                "success": True,
                "cover_letter": cover_letter_text,
                "job_title": job.title,
                "company_name": company_name,
                "generated_at": datetime.utcnow().isoformat(),
                "model_used": "gpt-4o-mini",
                "tone": tone,
                "length": length,
                "word_count": len(cover_letter_text.split())
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to generate cover letter: {str(e)}",
                "fallback_message": "Please use the template generator as a fallback."
            }
    
    def generate_template_cover_letter(
        self,
        job_title: str,
        company_name: str,
        user_name: str,
        key_skills: List[str],
        tone: str = "professional"
    ) -> str:
        """
        Generate a template-based cover letter when AI is not available
        """
        
        skills_text = ", ".join(key_skills[:3]) if key_skills else "relevant technical skills"
        
        if tone == "conversational":
            template = f"""Dear Hiring Manager,

I'm excited to apply for the {job_title} position at {company_name}. Your company's reputation for innovation and excellence aligns perfectly with my career goals and values.

In my previous roles, I've developed strong expertise in {skills_text}. I'm particularly drawn to this opportunity because it would allow me to contribute to {company_name}'s continued success while growing my own skills in a dynamic environment.

I'd love the opportunity to discuss how my background and enthusiasm can contribute to your team. Thank you for considering my application.

Best regards,
{user_name}"""
        
        else:  # professional tone
            template = f"""Dear Hiring Manager,

I am writing to express my strong interest in the {job_title} position at {company_name}. With my background in {skills_text}, I am confident that I would be a valuable addition to your team.

My experience has prepared me well for this role, and I am particularly impressed by {company_name}'s commitment to excellence in the industry. I am eager to contribute to your organization's continued success and growth.

I would welcome the opportunity to discuss my qualifications further. Thank you for your time and consideration.

Sincerely,
{user_name}"""
        
        return template
