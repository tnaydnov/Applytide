"""Database seeder for testing performance improvements"""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from faker import Faker
import random
from sqlalchemy.orm import Session
from backend.app.db.session import SessionLocal
from backend.app.db.models import User, Company, Job, Resume, Application, Stage, Note, MatchResult
from backend.app.core.security import hash_password

fake = Faker()

def create_seeder_session():
    """Create a database session for seeding"""
    return SessionLocal()

def seed_users(db: Session, count: int = 10):
    """Create test users"""
    users = []
    for i in range(count):
        user = User(
            id=uuid.uuid4(),
            email=f"testuser{i+1}@example.com",
            password_hash=hash_password("password123"),
            role="user",
            email_verified_at=datetime.now(timezone.utc) if random.choice([True, False]) else None,
            created_at=fake.date_time_between(start_date='-6M', end_date='now').replace(tzinfo=timezone.utc)
        )
        users.append(user)
        db.add(user)
    
    db.commit()
    print(f"✅ Created {count} users")
    return users

def seed_companies(db: Session, count: int = 50):
    """Create test companies"""
    companies = []
    company_types = ['Tech', 'Software', 'Solutions', 'Systems', 'Digital', 'Labs', 'Innovations', 'Corp', 'Inc']
    
    for _ in range(count):
        company_name = fake.company()
        if random.choice([True, False]):
            company_name = f"{fake.word().title()} {random.choice(company_types)}"
        
        company = Company(
            id=uuid.uuid4(),
            name=company_name,
            website=f"https://www.{company_name.lower().replace(' ', '').replace(',', '')}.com",
            location=f"{fake.city()}, {fake.state_abbr()}",
            notes=fake.text(max_nb_chars=200) if random.choice([True, False]) else None,
            created_at=fake.date_time_between(start_date='-1Y', end_date='now').replace(tzinfo=timezone.utc)
        )
        companies.append(company)
        db.add(company)
    
    db.commit()
    print(f"✅ Created {count} companies")
    return companies

def seed_jobs(db: Session, companies: list, count: int = 200):
    """Create test jobs"""
    job_titles = [
        "Software Engineer", "Senior Software Engineer", "Full Stack Developer", 
        "Frontend Developer", "Backend Developer", "DevOps Engineer", 
        "Product Manager", "Data Scientist", "Machine Learning Engineer",
        "Software Architect", "Technical Lead", "Engineering Manager",
        "QA Engineer", "Security Engineer", "Cloud Engineer",
        "Mobile Developer", "UI/UX Designer", "Product Designer"
    ]
    
    tech_keywords = [
        "Python", "JavaScript", "React", "Node.js", "AWS", "Docker", "Kubernetes",
        "PostgreSQL", "MongoDB", "Redis", "TypeScript", "GraphQL", "REST API",
        "Microservices", "CI/CD", "Git", "Agile", "Scrum", "Machine Learning",
        "TensorFlow", "PyTorch", "Pandas", "NumPy", "Flask", "Django", "FastAPI"
    ]
    
    remote_types = ["Remote", "Hybrid", "On-site", None]
    
    jobs = []
    for _ in range(count):
        title = random.choice(job_titles)
        company = random.choice(companies)
        
        # Generate description with tech keywords
        skills_needed = random.sample(tech_keywords, random.randint(3, 8))
        description = f"""
        We are looking for a {title} to join our team. You will be responsible for:
        
        • Developing and maintaining applications using {', '.join(skills_needed[:3])}
        • Collaborating with cross-functional teams
        • Writing clean, maintainable code
        • Participating in code reviews and architectural decisions
        
        Required Skills:
        {', '.join(skills_needed)}
        
        Experience: {random.randint(2, 8)} years
        
        {fake.text(max_nb_chars=300)}
        """
        
        job = Job(
            id=uuid.uuid4(),
            company_id=company.id,
            title=title,
            location=company.location if random.choice([True, False]) else f"{fake.city()}, {fake.state_abbr()}",
            remote_type=random.choice(remote_types),
            salary_min=random.randint(60000, 120000) if random.choice([True, False]) else None,
            salary_max=random.randint(80000, 200000) if random.choice([True, False]) else None,
            description=description,
            source_url=f"https://careers.{company.name.lower().replace(' ', '')}.com/job/{uuid.uuid4()}",
            created_at=fake.date_time_between(start_date='-6M', end_date='now').replace(tzinfo=timezone.utc)
        )
        jobs.append(job)
        db.add(job)
    
    db.commit()
    print(f"✅ Created {count} jobs")
    return jobs

def seed_resumes(db: Session, users: list, count: int = 30):
    """Create test resumes"""
    resume_labels = [
        "Software Engineer Resume", "Senior Developer CV", "Full Stack Portfolio",
        "Data Science Resume", "Product Manager CV", "Technical Lead Resume",
        "DevOps Engineer Profile", "Machine Learning Resume"
    ]
    
    resumes = []
    for _ in range(count):
        user = random.choice(users)
        label = f"{random.choice(resume_labels)} - {fake.date().strftime('%Y-%m')}"
        
        resume = Resume(
            id=uuid.uuid4(),
            user_id=user.id,
            label=label,
            file_path=f"/app/uploads/resumes/{uuid.uuid4()}.pdf",
            text=fake.text(max_nb_chars=2000),
            created_at=fake.date_time_between(start_date='-3M', end_date='now').replace(tzinfo=timezone.utc)
        )
        resumes.append(resume)
        db.add(resume)
    
    db.commit()
    print(f"✅ Created {count} resumes")
    return resumes

def seed_applications(db: Session, users: list, jobs: list, resumes: list, count: int = 150):
    """Create test applications"""
    statuses = ["Saved", "Applied", "Phone Screen", "Tech", "On-site", "Offer", "Accepted", "Rejected"]
    
    applications = []
    for _ in range(count):
        user = random.choice(users)
        job = random.choice(jobs)
        resume = random.choice([r for r in resumes if r.user_id == user.id]) if resumes else None
        
        created_at = fake.date_time_between(start_date='-3M', end_date='now').replace(tzinfo=timezone.utc)
        
        application = Application(
            id=uuid.uuid4(),
            user_id=user.id,
            job_id=job.id,
            resume_id=resume.id if resume else None,
            status=random.choice(statuses),
            created_at=created_at,
            updated_at=created_at + timedelta(days=random.randint(0, 30))
        )
        applications.append(application)
        db.add(application)
    
    db.commit()
    print(f"✅ Created {count} applications")
    return applications

def seed_stages_and_notes(db: Session, applications: list):
    """Create test stages and notes"""
    stage_names = ["Phone Screen", "Technical Interview", "System Design", "Cultural Fit", "Final Round"]
    outcomes = ["passed", "failed", "pending"]
    
    stages_count = 0
    notes_count = 0
    
    for app in applications:
        # Add some stages
        if random.choice([True, False]):
            num_stages = random.randint(1, 3)
            for i in range(num_stages):
                stage = Stage(
                    id=uuid.uuid4(),
                    application_id=app.id,
                    name=random.choice(stage_names),
                    scheduled_at=fake.date_time_between(
                        start_date=app.created_at, 
                        end_date=app.updated_at
                    ).replace(tzinfo=timezone.utc),
                    outcome=random.choice(outcomes) if random.choice([True, False]) else None,
                    notes=fake.text(max_nb_chars=200) if random.choice([True, False]) else None,
                    created_at=app.created_at + timedelta(days=i)
                )
                db.add(stage)
                stages_count += 1
        
        # Add some notes
        if random.choice([True, False]):
            num_notes = random.randint(1, 2)
            for i in range(num_notes):
                note = Note(
                    id=uuid.uuid4(),
                    application_id=app.id,
                    user_id=app.user_id,
                    body=fake.text(max_nb_chars=300),
                    created_at=app.created_at + timedelta(days=random.randint(0, 30))
                )
                db.add(note)
                notes_count += 1
    
    db.commit()
    print(f"✅ Created {stages_count} stages and {notes_count} notes")

def seed_match_results(db: Session, users: list, resumes: list, jobs: list, count: int = 100):
    """Create test match results"""
    match_results = []
    
    for _ in range(count):
        user = random.choice(users)
        resume = random.choice([r for r in resumes if r.user_id == user.id]) if resumes else None
        job = random.choice(jobs)
        
        if not resume:
            continue
        
        score = random.randint(20, 95)
        present_keywords = ["Python", "JavaScript", "React", "AWS", "Docker"]
        missing_keywords = ["Kubernetes", "GraphQL", "TypeScript"]
        
        match_result = MatchResult(
            id=uuid.uuid4(),
            user_id=user.id,
            resume_id=resume.id,
            job_id=job.id,
            score=score,
            keywords_present=",".join(random.sample(present_keywords, random.randint(2, 4))),
            keywords_missing=",".join(random.sample(missing_keywords, random.randint(1, 3))),
            created_at=fake.date_time_between(start_date='-1M', end_date='now').replace(tzinfo=timezone.utc)
        )
        match_results.append(match_result)
        db.add(match_result)
    
    db.commit()
    print(f"✅ Created {len(match_results)} match results")

def main():
    """Run the complete seeding process"""
    print("🌱 Starting database seeding...")
    
    db = create_seeder_session()
    
    try:
        # Seed in order due to foreign key constraints
        users = seed_users(db, count=15)
        companies = seed_companies(db, count=25)
        jobs = seed_jobs(db, companies, count=100)
        resumes = seed_resumes(db, users, count=30)
        applications = seed_applications(db, users, jobs, resumes, count=75)
        seed_stages_and_notes(db, applications)
        seed_match_results(db, users, resumes, jobs, count=50)
        
        print("\n🎉 Database seeding completed successfully!")
        print("\nSeeded data summary:")
        print(f"  👥 Users: 15")
        print(f"  🏢 Companies: 25") 
        print(f"  💼 Jobs: 100")
        print(f"  📄 Resumes: 30")
        print(f"  📋 Applications: 75")
        print(f"  📊 Match Results: 50")
        print(f"  📝 Stages and Notes: Various")
        
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
