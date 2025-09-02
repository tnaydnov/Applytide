"""
Real AI-powered cover letter generation using OpenAI GPT-4o-mini
Cost-effective model: ~$0.001-0.003 per cover letter
"""
import os
import openai
from typing import Optional, List
from sqlalchemy.orm import Session
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
        
        system_prompt = f"""You are an expert career coach and professional writer specializing in creating personalized, compelling cover letters. 

Your task is to write a {tone} cover letter of {word_count} words that:

1. ANALYZES the candidate's resume to identify:
   - Key technical and soft skills
   - Career progression and achievements
   - Relevant experience for this specific role
   - Transferable skills from previous positions

2. ANALYZES the job posting to identify:
   - Required technical skills
   - Desired qualifications
   - Company culture indicators
   - Key responsibilities

3. CREATES a highly personalized cover letter that:
   - Demonstrates clear understanding of the role requirements
   - Highlights relevant skills and experience from the resume
   - Shows how past roles have prepared the candidate for this position
   - Establishes cultural fit with the company
   - Uses specific examples and achievements when possible
   - Maintains a {tone} tone throughout

4. STRUCTURE:
   - Compelling opening that shows genuine interest and immediate value
   - 2-3 body paragraphs highlighting relevant experience and skills
   - Strong closing with call to action

Make it feel personal, not templated. Use industry-specific language when appropriate."""

        user_prompt = f"""RESUME CONTENT:
{resume_content}

JOB DETAILS:
Company: {company_name or 'Unknown Company'}
Job Title: {job.title}
Location: {job.location or 'Not specified'}
Job Description: {job.description or 'No description available'}

USER PROFILE:
{json.dumps(user_profile, indent=2) if user_profile else 'No additional profile information'}

Please generate a personalized cover letter that analyzes my background and shows how I'm specifically qualified for this role."""

        try:
            # Call OpenAI GPT-4o-mini (most cost-effective model)
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # Cheapest model: $0.15/1M input tokens, $0.60/1M output tokens
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=1000,
                temperature=0.7,  # Balanced creativity vs consistency
                top_p=0.9
            )
            
            cover_letter_content = response.choices[0].message.content.strip()
            
            # Calculate metrics
            word_count_actual = len(cover_letter_content.split())
            estimated_reading_time = f"{word_count_actual // 200 + 1} minutes"
            
            return {
                "cover_letter": cover_letter_content,
                "word_count": word_count_actual,
                "estimated_reading_time": estimated_reading_time,
                "ai_model_used": "gpt-4-turbo-preview",
                "analysis": {
                    "job_title": job.title,
                    "company": company_name,
                    "tone_requested": tone,
                    "length_requested": length
                }
            }
            
        except Exception as e:
            # Fallback to template-based generation if AI fails
            print(f"AI generation failed: {str(e)}")
            return self._fallback_template_generation(job, company_name, resume_content, tone, length)
    
    def _fallback_template_generation(self, job, company_name: str, resume_content: str, tone: str, length: str) -> dict:
        """Fallback template-based generation if AI service fails"""
        
        job_title = job.title
        intro = f"I am writing to express my strong interest in the {job_title} position at {company_name}."
        
        if tone == "enthusiastic":
            body_tone = "I am excited about the opportunity to contribute to your team and bring my passion for technology to this role."
        elif tone == "confident":
            body_tone = "With my proven track record and expertise, I am confident I would be a valuable addition to your team."
        else:  # professional
            body_tone = "I believe my experience and skills align well with the requirements for this position."
        
        # Basic skill extraction from resume
        skills_mentioned = []
        common_skills = ['Python', 'JavaScript', 'Java', 'React', 'SQL', 'AWS', 'Docker', 'Git', 'API']
        for skill in common_skills:
            if skill.lower() in resume_content.lower():
                skills_mentioned.append(skill)
        
        skills_text = f"My experience with {', '.join(skills_mentioned[:3])} " if skills_mentioned else "My technical background "
        
        if length == "short":
            template = f"""{intro}

{body_tone} {skills_text}would be valuable for this role at {company_name}.

I would welcome the opportunity to discuss how my background can contribute to your team's success. Thank you for your consideration.

Sincerely,
[Your Name]"""
        else:  # medium or long
            template = f"""{intro}

{body_tone} {skills_text}aligns well with the requirements outlined in your job posting. Through my previous experience, I have developed strong problem-solving abilities and a collaborative approach that would be valuable in this role.

I am particularly drawn to {company_name} because of your commitment to innovation and excellence. I believe my passion for continuous learning and my dedication to delivering high-quality results would make me a strong addition to your team.

I would welcome the opportunity to discuss how my background and enthusiasm can contribute to your team's continued success. Thank you for your time and consideration.

Sincerely,
[Your Name]"""

        word_count = len(template.split())
        return {
            "cover_letter": template,
            "word_count": word_count,
            "estimated_reading_time": f"{word_count // 200 + 1} minutes",
            "ai_model_used": "template_fallback",
            "analysis": {
                "job_title": job.title,
                "company": company_name,
                "tone_requested": tone,
                "length_requested": length,
                "note": "Generated using template fallback due to AI service unavailability"
            }
        }
