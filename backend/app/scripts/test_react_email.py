"""
Test script for React Email integration
Run this after starting docker-compose to verify email rendering works
"""
import sys
sys.path.insert(0, '/app')

from app.infra.notifications.email_templates import reminder_email_react
from app.infra.notifications.email_renderer import email_renderer

def test_email_service_health():
    """Test if email service is reachable"""
    print("🔍 Testing email service health...")
    if email_renderer.health_check():
        print("✅ Email service is healthy!")
        return True
    else:
        print("❌ Email service is not responding")
        return False

def test_list_templates():
    """Test listing available templates"""
    print("\n📋 Listing available templates...")
    templates = email_renderer.list_templates()
    if templates:
        print(f"✅ Found {len(templates)} templates:")
        for t in templates:
            print(f"   - {t}")
        return True
    else:
        print("❌ No templates found")
        return False

def test_render_reminder():
    """Test rendering a reminder email"""
    print("\n📧 Testing reminder email rendering...")
    
    # Test data
    ai_prep_tips = {
        'company': 'TechCorp',
        'companyInfo': 'TechCorp is a rapidly growing SaaS company known for innovative cloud solutions.',
        'prepTime': '8-12 hours',
        'focusAreas': [
            {'icon': '🎯', 'title': 'System Design', 'description': 'Load balancing, caching, sharding'},
            {'icon': '💎', 'title': 'Microservices', 'description': 'Service discovery, API gateways'},
            {'icon': '⚡', 'title': 'Scalability', 'description': 'Horizontal vs vertical, CAP theorem'},
            {'icon': '🚀', 'title': 'Cloud-Native', 'description': 'Kubernetes, Docker, service mesh'},
        ],
        'roadmap': [
            "Review TechCorp's engineering blog and identify 2-3 technical challenges",
            "Practice designing a distributed system end-to-end",
            "Prepare 3 STAR stories about handling traffic spikes",
            "Review CAP theorem with concrete examples",
            "Brush up on Kubernetes: pods, deployments, services",
        ]
    }
    
    html = reminder_email_react(
        name="Alex",
        title="Technical Interview - Senior Software Engineer",
        description="System design round with the engineering team. Focus on scalability and microservices architecture.",
        due_date="Tomorrow, Nov 5 at 2:00 PM",
        time_until="18 hours",
        urgency="tomorrow",
        event_type="interview",
        action_url="https://applytide.com/application/123",
        ai_prep_tips=ai_prep_tips
    )
    
    if html and len(html) > 1000:
        print(f"✅ Email rendered successfully! ({len(html)} characters)")
        print(f"   Preview: {html[:200]}...")
        
        # Save to file for inspection
        with open('/tmp/test_email.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"   💾 Saved to /tmp/test_email.html")
        return True
    else:
        print("❌ Email rendering failed or returned empty")
        return False

def test_fallback():
    """Test fallback to Python template when React service is down"""
    print("\n🔄 Testing fallback mechanism...")
    
    # Temporarily break the service URL
    original_url = email_renderer.base_url
    email_renderer.base_url = "http://nonexistent:9999"
    
    html = reminder_email_react(
        name="Alex",
        title="Test Reminder",
        description="Testing fallback",
        due_date="Tomorrow",
        time_until="1 day",
        urgency="tomorrow",
        event_type="general",
        action_url="https://applytide.com",
        ai_prep_tips=None
    )
    
    # Restore URL
    email_renderer.base_url = original_url
    
    if html and len(html) > 500:
        print(f"✅ Fallback worked! Rendered {len(html)} characters")
        return True
    else:
        print("❌ Fallback failed")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 React Email Integration Test Suite")
    print("=" * 60)
    
    results = []
    
    results.append(("Health Check", test_email_service_health()))
    results.append(("List Templates", test_list_templates()))
    results.append(("Render Email", test_render_reminder()))
    results.append(("Fallback Test", test_fallback()))
    
    print("\n" + "=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {name}")
    
    all_passed = all(r[1] for r in results)
    print("\n" + ("🎉 All tests passed!" if all_passed else "⚠️  Some tests failed"))
    
    sys.exit(0 if all_passed else 1)
