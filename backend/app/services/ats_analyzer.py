"""
ATS Analysis Service - Job-Specific Resume Analysis
"""
import re
import json
from typing import Dict, List, Tuple, Optional
from collections import Counter
import math

class ATSAnalyzer:
    def __init__(self):
        # Enhanced tech skills patterns (more comprehensive)
        self.tech_skills_patterns = [
            # Programming Languages
            r'\b(python|java|javascript|typescript|c\+\+|c#|php|ruby|go|rust|swift|kotlin|scala|r|matlab|perl)\b',
            # Web Technologies
            r'\b(react|angular|vue|node\.?js|express|django|flask|spring|laravel|fastapi|nextjs|nuxt)\b',
            # Databases
            r'\b(sql|mysql|postgresql|mongodb|redis|elasticsearch|cassandra|oracle|sqlite|dynamodb)\b',
            # Cloud & DevOps
            r'\b(aws|azure|gcp|google.cloud|docker|kubernetes|jenkins|gitlab|github|terraform|ansible|chef|puppet)\b',
            # Data & AI
            r'\b(pandas|numpy|tensorflow|pytorch|scikit.learn|spark|hadoop|kafka|tableau|power.bi|excel)\b',
            # Frameworks & Libraries
            r'\b(bootstrap|jquery|sass|less|webpack|babel|maven|gradle|pip|npm|yarn)\b',
            # Other Tools & Technologies
            r'\b(git|jira|confluence|slack|figma|adobe|photoshop|illustrator|linux|windows|macos|unix)\b',
            # Methodologies
            r'\b(agile|scrum|kanban|waterfall|devops|ci.cd|tdd|bdd)\b'
        ]
        
        # Enhanced soft skills patterns
        self.soft_skills_patterns = [
            r'\b(leadership|management|communication|teamwork|collaboration|coordination)\b',
            r'\b(problem.solving|analytical|critical.thinking|creative|innovation|strategic)\b',
            r'\b(project.management|agile|scrum|kanban|planning|organization)\b',
            r'\b(mentoring|coaching|training|presentation|public.speaking|negotiation)\b',
            r'\b(adaptability|flexibility|time.management|multitasking|attention.to.detail)\b'
        ]
        
        # Experience level indicators
        self.experience_patterns = {
            'senior': [r'senior', r'lead', r'principal', r'architect', r'director', r'manager', r'head.of', r'chief'],
            'mid': [r'developer', r'engineer', r'analyst', r'specialist', r'consultant', r'coordinator'],
            'junior': [r'junior', r'associate', r'intern', r'entry.level', r'trainee', r'assistant']
        }
    
    def analyze_resume_for_job(self, resume_text: str, job_description: str, document_metadata: Dict = None) -> Dict:
        """
        Analyze resume against specific job requirements
        """
        if not resume_text or not resume_text.strip():
            return self._create_error_response("Resume text is empty or could not be extracted")
        
        if not job_description or not job_description.strip():
            return self._create_error_response("Job description is required for analysis")
        
        # Step 1: Extract job requirements
        job_analysis = self.analyze_job_description(job_description)
        
        # Step 2: Parse resume content
        resume_analysis = self.analyze_resume_content(resume_text)
        
        # Step 3: Calculate compatibility scores
        compatibility = self.calculate_compatibility(resume_analysis, job_analysis)
        
        # Step 4: Generate specific recommendations
        recommendations = self.generate_targeted_recommendations(
            resume_analysis, job_analysis, compatibility
        )
        
        return {
            "success": True,
            "ats_score": compatibility["scores"],
            "keyword_analysis": compatibility["keyword_match"],
            "missing_skills": compatibility["missing_skills"],
            "suggested_improvements": recommendations,
            "missing_sections": self.identify_missing_sections(resume_analysis),
            "word_count": len(resume_text.split()),
            "readability_score": self.calculate_readability_score(resume_text),
            "keyword_density": self.calculate_keyword_density(resume_text, job_analysis["keywords"]),
            "job_match_summary": self.create_match_summary(compatibility, resume_analysis),
            "document_metadata": document_metadata or {},
            "resume_analysis": {
                "sections_found": resume_analysis["sections"],
                "tech_skills_found": resume_analysis["tech_skills"],
                "education_found": resume_analysis["education"],
                "experience_level": resume_analysis["experience_level"],
                "has_sections": {
                    "experience": resume_analysis["has_experience_section"],
                    "education": resume_analysis["has_education_section"], 
                    "skills": resume_analysis["has_skills_section"]
                }
            }
        }
    
    def analyze_job_description(self, job_description: str) -> Dict:
        """Extract and categorize requirements from job description"""
        job_text = job_description.lower()
        
        # Extract technical skills
        tech_skills = set()
        for pattern in self.tech_skills_patterns:
            matches = re.findall(pattern, job_text, re.IGNORECASE)
            tech_skills.update(matches)
        
        # Extract soft skills
        soft_skills = set()
        for pattern in self.soft_skills_patterns:
            matches = re.findall(pattern, job_text, re.IGNORECASE)
            soft_skills.update(matches)
        
        # Extract experience requirements
        experience_req = self.extract_experience_requirements(job_description)
        
        # Extract education requirements
        education_req = self.extract_education_requirements(job_description)
        
        # Create weighted keywords (higher weights for repeated/emphasized terms)
        all_keywords = {}
        
        # Technical skills get highest weight
        for skill in tech_skills:
            count = len(re.findall(rf'\b{re.escape(skill)}\b', job_text, re.IGNORECASE))
            all_keywords[skill] = count * 3.0
        
        # Soft skills get medium weight
        for skill in soft_skills:
            count = len(re.findall(rf'\b{re.escape(skill)}\b', job_text, re.IGNORECASE))
            all_keywords[skill] = count * 2.0
        
        # Industry-specific terms
        industry_terms = self.extract_industry_terms(job_description)
        for term in industry_terms:
            count = len(re.findall(rf'\b{re.escape(term)}\b', job_text, re.IGNORECASE))
            all_keywords[term] = count * 2.5
        
        return {
            "keywords": all_keywords,
            "tech_skills": list(tech_skills),
            "soft_skills": list(soft_skills),
            "experience_requirements": experience_req,
            "education_requirements": education_req,
            "industry_terms": industry_terms,
            "job_level": self.determine_job_level(job_description)
        }
    
    def analyze_resume_content(self, resume_text: str) -> Dict:
        """Analyze and extract information from resume"""
        resume_lower = resume_text.lower()
        
        # Extract skills mentioned in resume with enhanced matching
        resume_tech_skills = set()
        for pattern in self.tech_skills_patterns:
            matches = re.findall(pattern, resume_lower, re.IGNORECASE)
            # Clean up matches and add variations
            for match in matches:
                resume_tech_skills.add(match)
                # Add common variations
                if match == 'javascript':
                    resume_tech_skills.add('js')
                elif match == 'typescript':
                    resume_tech_skills.add('ts')
                elif match == 'python':
                    resume_tech_skills.add('py')
        
        # Additional tech skills search (case-insensitive word boundary search)
        additional_tech_terms = [
            'html', 'css', 'xml', 'json', 'api', 'rest', 'graphql',
            'microservices', 'oauth', 'jwt', 'ssl', 'tls', 'http', 'https',
            'nosql', 'orm', 'mvc', 'mvp', 'spa', 'pwa', 'seo'
        ]
        
        for term in additional_tech_terms:
            if re.search(rf'\b{term}\b', resume_lower):
                resume_tech_skills.add(term)
        
        resume_soft_skills = set()
        for pattern in self.soft_skills_patterns:
            matches = re.findall(pattern, resume_lower, re.IGNORECASE)
            resume_soft_skills.update(matches)
        
        # Extract experience level
        experience_level = self.determine_experience_level(resume_text)
        
        # Extract education
        education = self.extract_education_from_resume(resume_text)
        
        # Extract quantified achievements
        achievements = self.extract_achievements(resume_text)
        
        # Analyze sections present
        sections = self.identify_resume_sections(resume_text)
        
        return {
            "tech_skills": list(resume_tech_skills),
            "soft_skills": list(resume_soft_skills),
            "experience_level": experience_level,
            "education": education,
            "achievements": achievements,
            "sections": sections,
            "text": resume_text,
            "has_experience_section": 'experience' in sections,
            "has_education_section": 'education' in sections,
            "has_skills_section": 'skills' in sections
        }
    
    def calculate_compatibility(self, resume_analysis: Dict, job_analysis: Dict) -> Dict:
        """Calculate detailed compatibility scores"""
        
        # 1. Technical Skills Match (35%)
        tech_match = self.calculate_skills_match(
            resume_analysis["tech_skills"], 
            job_analysis["tech_skills"]
        )
        
        # 2. Soft Skills Match (20%)
        soft_match = self.calculate_skills_match(
            resume_analysis["soft_skills"], 
            job_analysis["soft_skills"]
        )
        
        # 3. Keyword Density Score (25%)
        keyword_score = self.calculate_keyword_match_score(
            resume_analysis["text"], 
            job_analysis["keywords"]
        )
        
        # 4. Experience Level Match (10%)
        experience_score = self.calculate_experience_match(
            resume_analysis["experience_level"],
            job_analysis["job_level"]
        )
        
        # 5. Document Structure/Formatting (10%)
        formatting_score = self.calculate_formatting_score(resume_analysis["sections"])
        
        # Calculate weighted overall score
        overall_score = (
            tech_match * 0.35 +
            soft_match * 0.20 +
            keyword_score * 0.25 +
            experience_score * 0.10 +
            formatting_score * 0.10
        )
        
        # Find missing skills
        missing_tech_skills = set(job_analysis["tech_skills"]) - set(resume_analysis["tech_skills"])
        missing_soft_skills = set(job_analysis["soft_skills"]) - set(resume_analysis["soft_skills"])
        
        return {
            "scores": {
                "overall_score": min(overall_score, 100.0),
                "technical_skills_score": tech_match,
                "soft_skills_score": soft_match,
                "keyword_score": keyword_score,
                "experience_score": experience_score,
                "formatting_score": formatting_score
            },
            "keyword_match": {
                "matched_keywords": self.get_matched_keywords(resume_analysis["text"], job_analysis["keywords"]),
                "total_job_keywords": len(job_analysis["keywords"]),
                "match_percentage": keyword_score
            },
            "missing_skills": {
                "technical": list(missing_tech_skills),
                "soft": list(missing_soft_skills),
                "critical_missing": self.identify_critical_missing_skills(job_analysis["keywords"], resume_analysis["text"])
            }
        }
    
    def generate_targeted_recommendations(self, resume_analysis: Dict, job_analysis: Dict, compatibility: Dict) -> List[str]:
        """Generate specific, actionable recommendations"""
        recommendations = []
        
        # Skills-based recommendations
        missing_tech = compatibility["missing_skills"]["technical"]
        if missing_tech:
            top_missing = missing_tech[:3]  # Focus on top 3
            recommendations.append(
                f"Add these high-priority technical skills to your resume: {', '.join(top_missing)}"
            )
        
        # Keyword optimization
        if compatibility["scores"]["keyword_score"] < 70:
            critical_keywords = compatibility["missing_skills"]["critical_missing"]
            if critical_keywords:
                recommendations.append(
                    f"Include these job-specific keywords: {', '.join(critical_keywords[:3])}"
                )
        
        # Quantified achievements
        if not resume_analysis["achievements"]:
            recommendations.append(
                "Add quantified achievements with specific numbers, percentages, or dollar amounts (e.g., 'Increased efficiency by 25%')"
            )
        
        # Experience level alignment
        if compatibility["scores"]["experience_score"] < 60:
            if job_analysis["job_level"] == "senior" and resume_analysis["experience_level"] != "senior":
                recommendations.append(
                    "Highlight leadership experience and senior-level responsibilities more prominently"
                )
        
        # Section improvements
        missing_sections = self.identify_missing_sections(resume_analysis)
        if missing_sections:
            recommendations.append(
                f"Consider adding these sections: {', '.join(missing_sections[:2])}"
            )
        
        # Formatting improvements
        if compatibility["scores"]["formatting_score"] < 80:
            recommendations.append(
                "Improve resume structure with clear section headers and consistent formatting"
            )
        
        return recommendations
    
    # Helper methods
    def calculate_skills_match(self, resume_skills: List[str], job_skills: List[str]) -> float:
        """Calculate percentage match between resume and job skills"""
        if not job_skills:
            return 100.0
        
        resume_skills_lower = {skill.lower() for skill in resume_skills}
        job_skills_lower = {skill.lower() for skill in job_skills}
        
        matched = len(resume_skills_lower.intersection(job_skills_lower))
        return (matched / len(job_skills_lower)) * 100.0
    
    def calculate_keyword_match_score(self, resume_text: str, job_keywords: Dict[str, float]) -> float:
        """Calculate weighted keyword match score"""
        if not job_keywords:
            return 100.0
        
        resume_lower = resume_text.lower()
        total_weight = sum(job_keywords.values())
        matched_weight = 0.0
        
        for keyword, weight in job_keywords.items():
            if re.search(rf'\b{re.escape(keyword.lower())}\b', resume_lower):
                matched_weight += weight
        
        return (matched_weight / total_weight) * 100.0 if total_weight > 0 else 0.0
    
    def extract_experience_requirements(self, job_description: str) -> Dict:
        """Extract experience requirements from job description"""
        # Look for years of experience
        years_pattern = r'(\d+)\+?\s*(?:to\s*\d+\s*)?years?\s*(?:of\s*)?(?:experience|exp)'
        years_matches = re.findall(years_pattern, job_description.lower())
        
        min_years = 0
        if years_matches:
            min_years = min([int(match) for match in years_matches])
        
        # Look for experience level keywords
        level_indicators = {
            'entry': ['entry', 'junior', 'new grad', 'recent graduate'],
            'mid': ['mid-level', 'intermediate', '3-5 years', '2-4 years'],
            'senior': ['senior', 'lead', 'principal', 'expert', '5+ years', '7+ years']
        }
        
        detected_level = 'mid'  # default
        job_lower = job_description.lower()
        
        for level, indicators in level_indicators.items():
            for indicator in indicators:
                if indicator in job_lower:
                    detected_level = level
                    break
        
        return {
            "min_years": min_years,
            "level": detected_level
        }
    
    def extract_education_requirements(self, job_description: str) -> List[str]:
        """Extract education requirements"""
        education_patterns = [
            r'bachelor\'?s?\s*(?:degree)?',
            r'master\'?s?\s*(?:degree)?', 
            r'phd|doctorate',
            r'associate\'?s?\s*(?:degree)?',
            r'high school|diploma'
        ]
        
        requirements = []
        job_lower = job_description.lower()
        
        for pattern in education_patterns:
            if re.search(pattern, job_lower):
                requirements.append(pattern.replace('\\', '').replace('?', ''))
        
        return requirements
    
    def determine_job_level(self, job_description: str) -> str:
        """Determine job level from description"""
        job_lower = job_description.lower()
        
        senior_indicators = ['senior', 'lead', 'principal', 'director', 'manager', 'head of', 'chief']
        junior_indicators = ['junior', 'entry', 'associate', 'intern', 'trainee']
        
        for indicator in senior_indicators:
            if indicator in job_lower:
                return 'senior'
        
        for indicator in junior_indicators:
            if indicator in job_lower:
                return 'junior'
        
        return 'mid'
    
    def determine_experience_level(self, resume_text: str) -> str:
        """Determine candidate's experience level from resume with enhanced detection"""
        resume_lower = resume_text.lower()
        
        # Look for years of experience mentioned (multiple patterns)
        years_patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:work|professional)',
            r'(\d+)\+?\s*years?\s*(?:in|with)',
            r'over\s*(\d+)\s*years?',
            r'more\s*than\s*(\d+)\s*years?'
        ]
        
        max_years = 0
        for pattern in years_patterns:
            years_matches = re.findall(pattern, resume_lower)
            if years_matches:
                pattern_max = max([int(match) for match in years_matches])
                max_years = max(max_years, pattern_max)
        
        if max_years >= 7:
            return 'senior'
        elif max_years >= 3:
            return 'mid'
        elif max_years > 0:
            return 'junior'
        
        # Look for title indicators
        senior_titles = ['senior', 'lead', 'principal', 'director', 'manager', 'head of', 'chief', 'vp', 'vice president']
        junior_titles = ['junior', 'associate', 'intern', 'trainee', 'entry', 'graduate', 'fresh']
        
        for title in senior_titles:
            if re.search(rf'\b{title}\b', resume_lower):
                return 'senior'
        
        for title in junior_titles:
            if re.search(rf'\b{title}\b', resume_lower):
                return 'junior'
        
        # Check for multiple job positions (indicates experience)
        job_patterns = [
            r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec).*\d{4}',  # Date patterns
            r'\d{4}\s*-\s*\d{4}',  # Year ranges
            r'present|current|now'  # Current position indicators
        ]
        
        date_matches = 0
        for pattern in job_patterns:
            matches = re.findall(pattern, resume_lower)
            date_matches += len(matches)
        
        # If multiple date ranges found, likely has experience
        if date_matches >= 4:  # Multiple positions
            return 'mid'
        elif date_matches >= 2:  # Some experience
            return 'junior'
        
        return 'mid'  # Default to mid-level if unclear
    
    def extract_achievements(self, resume_text: str) -> List[str]:
        """Extract quantified achievements from resume"""
        # Patterns for quantified achievements
        achievement_patterns = [
            r'[^.]*\d+%[^.]*',  # Percentages
            r'[^.]*\$\d+(?:,\d{3})*(?:\.\d{2})?[^.]*',  # Dollar amounts
            r'[^.]*\d+\+[^.]*',  # Numbers with +
            r'[^.]*\d{1,3}(?:,\d{3})*\s*(?:users|customers|clients|employees|projects)[^.]*'  # Large numbers
        ]
        
        achievements = []
        for pattern in achievement_patterns:
            matches = re.findall(pattern, resume_text, re.IGNORECASE)
            achievements.extend([match.strip() for match in matches])
        
        return achievements[:5]  # Return top 5
    
    def identify_resume_sections(self, resume_text: str) -> List[str]:
        """Identify sections present in resume with flexible pattern matching"""
        sections_found = []
        section_patterns = {
            'summary': [r'summary', r'profile', r'objective', r'about', r'overview'],
            'experience': [r'experience', r'employment', r'work', r'career', r'professional', r'history'],
            'education': [r'education', r'academic', r'degree', r'university', r'college', r'school'],
            'skills': [r'skills', r'competencies', r'technologies', r'technical', r'expertise', r'proficiencies'],
            'projects': [r'projects', r'portfolio', r'work.samples', r'achievements'],
            'certifications': [r'certifications', r'certificates', r'credentials', r'licenses'],
            'achievements': [r'achievements', r'awards', r'honors', r'recognition', r'accomplishments']
        }
        
        resume_lower = resume_text.lower()
        for section, patterns in section_patterns.items():
            for pattern in patterns:
                # More flexible pattern matching - check for section headers in various formats
                flexible_patterns = [
                    rf'^{pattern}',  # Start of line
                    rf'^•\s*{pattern}',  # Bullet point
                    rf'^-\s*{pattern}',  # Dash
                    rf'^#{pattern}',  # Hash
                    rf'^\*\s*{pattern}',  # Asterisk
                    rf'^\d+\.\s*{pattern}',  # Numbered
                    rf'\b{pattern}\s*:',  # Followed by colon
                    rf'\b{pattern}\s*\n',  # Followed by newline
                    rf'^[A-Z\s]*{pattern.upper()}[A-Z\s]*$',  # All caps section headers
                    rf'^\s*{pattern}\s*$'  # Standalone on line with optional whitespace
                ]
                
                for flex_pattern in flexible_patterns:
                    if re.search(flex_pattern, resume_lower, re.MULTILINE | re.IGNORECASE):
                        sections_found.append(section)
                        break
                if section in sections_found:
                    break
        
        return sections_found
    
    def calculate_readability_score(self, text: str) -> float:
        """Calculate basic readability score"""
        sentences = len(re.findall(r'[.!?]+', text))
        words = len(text.split())
        
        if sentences == 0:
            return 0.0
        
        avg_sentence_length = words / sentences
        
        # Simple readability score (higher is better, max 100)
        if avg_sentence_length <= 15:
            return 90.0
        elif avg_sentence_length <= 20:
            return 75.0
        elif avg_sentence_length <= 25:
            return 60.0
        else:
            return 40.0
    
    def calculate_keyword_density(self, resume_text: str, job_keywords: Dict[str, float]) -> Dict[str, float]:
        """Calculate keyword density in resume"""
        resume_lower = resume_text.lower()
        word_count = len(resume_text.split())
        
        density = {}
        for keyword in job_keywords.keys():
            count = len(re.findall(rf'\b{re.escape(keyword.lower())}\b', resume_lower))
            density[keyword] = (count / word_count) * 100 if word_count > 0 else 0
        
        # Return top 10 keywords by density
        return dict(sorted(density.items(), key=lambda x: x[1], reverse=True)[:10])
    
    def _create_error_response(self, error_message: str) -> Dict:
        """Create standardized error response"""
        return {
            "success": False,
            "error": error_message,
            "ats_score": {
                "overall_score": 0,
                "technical_skills_score": 0,
                "soft_skills_score": 0,
                "keyword_score": 0,
                "experience_score": 0,
                "formatting_score": 0
            },
            "suggested_improvements": [error_message],
            "missing_sections": [],
            "word_count": 0,
            "readability_score": 0,
            "keyword_density": {}
        }
    
    # Additional helper methods
    def extract_industry_terms(self, job_description: str) -> List[str]:
        """Extract industry-specific terms"""
        # This could be expanded with ML-based term extraction
        common_terms = ['api', 'microservices', 'cloud', 'devops', 'ci/cd', 'agile', 'scrum']
        found_terms = []
        
        job_lower = job_description.lower()
        for term in common_terms:
            if term in job_lower:
                found_terms.append(term)
        
        return found_terms
    
    def get_matched_keywords(self, resume_text: str, job_keywords: Dict[str, float]) -> List[str]:
        """Get list of keywords that matched between resume and job"""
        resume_lower = resume_text.lower()
        matched = []
        
        for keyword in job_keywords.keys():
            if re.search(rf'\b{re.escape(keyword.lower())}\b', resume_lower):
                matched.append(keyword)
        
        return matched
    
    def identify_critical_missing_skills(self, job_keywords: Dict[str, float], resume_text: str) -> List[str]:
        """Identify high-importance missing keywords"""
        resume_lower = resume_text.lower()
        missing = []
        
        # Sort keywords by weight (importance)
        sorted_keywords = sorted(job_keywords.items(), key=lambda x: x[1], reverse=True)
        
        for keyword, weight in sorted_keywords:
            if weight > 2.0 and not re.search(rf'\b{re.escape(keyword.lower())}\b', resume_lower):
                missing.append(keyword)
        
        return missing[:5]  # Top 5 critical missing
    
    def identify_missing_sections(self, resume_analysis: Dict) -> List[str]:
        """Identify important missing sections"""
        required_sections = ['experience', 'education', 'skills']
        present_sections = resume_analysis.get('sections', [])
        
        missing = []
        for section in required_sections:
            if section not in present_sections:
                missing.append(section.title())
        
        return missing
    
    def calculate_formatting_score(self, sections: List[str]) -> float:
        """Calculate formatting/structure score"""
        required_sections = ['experience', 'education', 'skills']
        score = 0
        
        # Base score for having required sections
        for section in required_sections:
            if section in sections:
                score += 25
        
        # Bonus for additional good sections
        bonus_sections = ['summary', 'projects', 'certifications']
        for section in bonus_sections:
            if section in sections:
                score += 8.33  # Up to 25 bonus points
        
        return min(score, 100.0)
    
    def calculate_experience_match(self, resume_level: str, job_level: str) -> float:
        """Calculate experience level match"""
        level_scores = {
            ('junior', 'junior'): 100,
            ('junior', 'mid'): 60,
            ('junior', 'senior'): 20,
            ('mid', 'junior'): 90,
            ('mid', 'mid'): 100,
            ('mid', 'senior'): 70,
            ('senior', 'junior'): 80,
            ('senior', 'mid'): 95,
            ('senior', 'senior'): 100
        }
        
        return level_scores.get((resume_level, job_level), 50)
    
    def create_match_summary(self, compatibility: Dict, resume_analysis: Dict = None) -> Dict:
        """Create a summary of the job match"""
        overall_score = compatibility["scores"]["overall_score"]
        
        if overall_score >= 80:
            match_level = "Excellent Match"
            summary = "Your resume aligns very well with this job's requirements."
        elif overall_score >= 60:
            match_level = "Good Match"
            summary = "Your resume meets most of this job's requirements with some areas for improvement."
        elif overall_score >= 40:
            match_level = "Fair Match"
            summary = "Your resume partially aligns with this job's requirements. Consider significant improvements."
        else:
            match_level = "Poor Match"
            summary = "Your resume needs substantial improvements to match this job's requirements."
        
        # Add section analysis if available
        section_notes = []
        if resume_analysis:
            if resume_analysis.get("has_experience_section"):
                section_notes.append("✓ Experience section found")
            else:
                section_notes.append("⚠ Experience section missing or not detected")
                
            if resume_analysis.get("has_education_section"):
                section_notes.append("✓ Education section found")
            else:
                section_notes.append("⚠ Education section missing or not detected")
                
            if resume_analysis.get("has_skills_section"):
                section_notes.append("✓ Skills section found")
            else:
                section_notes.append("⚠ Skills section missing or not detected")
        
        return {
            "match_level": match_level,
            "summary": summary,
            "score": overall_score,
            "section_analysis": section_notes
        }
    
    def extract_education_from_resume(self, resume_text: str) -> List[str]:
        """Extract education information from resume with enhanced pattern matching"""
        education_patterns = [
            # Degree patterns
            r'bachelor\'?s?\s*(?:degree)?\s*(?:in|of)?\s*([a-zA-Z\s&]+)',
            r'master\'?s?\s*(?:degree)?\s*(?:in|of)?\s*([a-zA-Z\s&]+)',
            r'phd|doctorate\s*(?:in|of)?\s*([a-zA-Z\s&]+)',
            r'associate\'?s?\s*(?:degree)?\s*(?:in|of)?\s*([a-zA-Z\s&]+)',
            r'b\.?[sa]\.?\s*(?:in|of)?\s*([a-zA-Z\s&]+)',
            r'm\.?[sa]\.?\s*(?:in|of)?\s*([a-zA-Z\s&]+)',
            r'mba\s*(?:in|of)?\s*([a-zA-Z\s&]*)',
            # Institution patterns
            r'university|college|institute|school',
            # General education indicators
            r'graduated|degree|diploma|certification'
        ]
        
        education = []
        resume_lower = resume_text.lower()
        
        # Check for education section presence first
        has_education_section = False
        education_section_patterns = [
            r'education', r'academic', r'degree', r'university', 
            r'college', r'school', r'qualification'
        ]
        
        for pattern in education_section_patterns:
            if re.search(rf'\b{pattern}\b', resume_lower):
                has_education_section = True
                break
        
        # Extract specific degrees and fields
        for pattern in education_patterns[:7]:  # Only degree patterns
            matches = re.findall(pattern, resume_lower)
            for match in matches:
                if isinstance(match, str) and len(match.strip()) > 2:
                    education.append(match.strip().title())
        
        # If we found education section but no specific degrees, mark as having education
        if has_education_section and not education:
            education.append("Education Section Present")
        
        return education[:5]  # Return top 5 education entries
