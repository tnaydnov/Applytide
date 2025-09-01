#!/usr/bin/env python3
"""
Test script for enhanced ATS analyzer
"""
import sys
import os
sys.path.append('backend')

from app.services.ats_analyzer import ATSAnalyzer

def test_enhanced_analyzer():
    analyzer = ATSAnalyzer()
    
    # Sample resume text based on your resume structure
    sample_resume = """
    TOMER NAYDNOV
    
    TECHNICAL SKILLS
    • Programming Languages: Python, Java, C++, JavaScript
    • Web Technologies: React, HTML, CSS, Node.js
    • Databases: SQL, MySQL, PostgreSQL
    • Tools: Git, Docker, AWS
    
    WORK EXPERIENCE
    Software Engineer - ABC Company (2020-2023)
    • Developed web applications using React and Python
    • Collaborated with team of 5 developers
    • Improved system performance by 30%
    
    EDUCATION
    Bachelor's Degree in Computer Science
    XYZ University (2016-2020)
    """
    
    # Sample job description
    job_description = """
    Software Developer Position
    
    Requirements:
    • 3+ years of experience in Python development
    • Strong knowledge of React and JavaScript
    • Experience with databases (SQL, PostgreSQL)
    • Bachelor's degree in Computer Science or related field
    • Good communication and teamwork skills
    """
    
    print("Testing Enhanced ATS Analyzer...")
    print("=" * 50)
    
    # Analyze resume content
    resume_analysis = analyzer.analyze_resume_content(sample_resume)
    print(f"Sections detected: {resume_analysis['sections']}")
    print(f"Tech skills found: {resume_analysis['tech_skills']}")
    print(f"Education found: {resume_analysis['education']}")
    print(f"Experience level: {resume_analysis['experience_level']}")
    print(f"Has experience section: {resume_analysis['has_experience_section']}")
    print(f"Has education section: {resume_analysis['has_education_section']}")
    print(f"Has skills section: {resume_analysis['has_skills_section']}")
    
    print("\n" + "=" * 50)
    
    # Full analysis
    result = analyzer.analyze_resume_for_job(sample_resume, job_description)
    
    if result["success"]:
        print("Analysis Results:")
        print(f"Overall ATS Score: {result['ats_score']['overall_score']:.1f}%")
        print(f"Technical Skills Score: {result['ats_score']['technical_skills_score']:.1f}%")
        print(f"Match Level: {result['job_match_summary']['match_level']}")
        print(f"Summary: {result['job_match_summary']['summary']}")
        
        if 'section_analysis' in result['job_match_summary']:
            print("\nSection Analysis:")
            for note in result['job_match_summary']['section_analysis']:
                print(f"  {note}")
        
        print(f"\nResume Analysis Details:")
        ra = result['resume_analysis']
        print(f"  Sections found: {ra['sections_found']}")
        print(f"  Tech skills: {ra['tech_skills_found']}")
        print(f"  Education: {ra['education_found']}")
        print(f"  Experience level: {ra['experience_level']}")
    else:
        print(f"Analysis failed: {result}")

if __name__ == "__main__":
    test_enhanced_analyzer()
