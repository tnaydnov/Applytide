"""
Branded Email Templates for Applytide
Beautiful, consistent email designs with the WOW factor
"""

BRAND_COLORS = {
    'primary': '#6366f1',      # Indigo - main brand
    'secondary': '#8b5cf6',    # Purple - accent
    'success': '#10b981',      # Green - positive actions
    'warning': '#f59e0b',      # Amber - warnings
    'danger': '#ef4444',       # Red - critical
    'dark': '#0f172a',         # Slate - dark text (darker)
    'light': '#f8fafc',        # Slate - light bg
    'gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'neon_blue': '#3b82f6',    # Bright blue
    'neon_purple': '#a855f7',  # Bright purple
    'cyber_dark': '#1e1b4b',   # Deep indigo
    'tech_gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
}

def base_template(content: str, preview_text: str = "") -> str:
    """Base email template with consistent branding"""
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <title>Applytide</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {{font-family: Arial, sans-serif !important;}}
    </style>
    <![endif]-->
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body {{
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }}
        
        .email-wrapper {{
            width: 100%;
            background: #f8fafc;
            padding: 40px 20px;
        }}
        
        .email-container {{
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }}
        
        .email-header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
        }}
        
        .logo-container {{
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
        }}
        
        .logo-img {{
            height: 55px;
            width: auto;
            display: block;
        }}
        
        .brand-name {{
            color: white;
            font-size: 32px;
            font-weight: 700;
            margin: 0;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }}
        
        .email-body {{
            padding: 40px 35px;
            background: white;
        }}
        
        .email-footer {{
            background: #1e293b;
            padding: 30px;
            text-align: center;
            color: #94a3b8;
            font-size: 13px;
        }}
        
        .btn {{
            display: inline-block;
            padding: 16px 32px;
            background: {BRAND_COLORS['gradient']};
            color: white !important;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
            transition: all 0.3s ease;
        }}
        
        .btn:hover {{
            box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
            transform: translateY(-2px);
        }}
        
        .btn-secondary {{
            background: white;
            color: {BRAND_COLORS['primary']} !important;
            border: 2px solid {BRAND_COLORS['primary']};
        }}
        
        .divider {{
            height: 1px;
            background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
            margin: 30px 0;
        }}
        
        .footer-links a {{
            color: #cbd5e1;
            text-decoration: none;
            margin: 0 10px;
        }}
        
        .footer-links a:hover {{
            color: white;
        }}
        
        @media only screen and (max-width: 600px) {{
            .email-wrapper {{
                padding: 20px 10px;
            }}
            
            .email-header {{
                padding: 30px 20px;
            }}
            
            .email-body {{
                padding: 30px 20px;
            }}
            
            .btn {{
                width: 100%;
                box-sizing: border-box;
            }}
        }}
    </style>
</head>
<body>
    <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        {preview_text}
    </div>
    
    <div class="email-wrapper">
        <div class="email-container">
            <div class="email-header">
                <div class="logo-container">
                    <img src="https://applytide.com/images/logomark.png" alt="Applytide" class="logo-img" />
                    <h1 class="brand-name">Applytide</h1>
                </div>
            </div>
            
            <div class="email-body">
                {content}
            </div>
            
            <div class="email-footer">
                <p style="margin: 15px 0 5px; font-weight: 600; color: #cbd5e1;">Applytide</p>
                <p style="margin: 5px 0;">Your AI-powered job application tracker</p>
                
                <div class="divider"></div>
                
                <div class="footer-links">
                    <a href="https://applytide.com">Home</a>
                    <a href="https://applytide.com/dashboard">Dashboard</a>
                    <a href="https://applytide.com/privacy">Privacy</a>
                    <a href="https://applytide.com/contact">Contact</a>
                </div>
                
                <p style="margin-top: 20px; font-size: 12px;">
                    © 2025 Applytide. All rights reserved.<br>
                    You're receiving this because you have an account with us.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
    """


def welcome_email(name: str, email: str) -> str:
    """Welcome email for new users"""
    content = f"""
        <h2 style="color: {BRAND_COLORS['dark']}; font-size: 28px; font-weight: 700; margin: 0 0 10px 0;">
            Welcome aboard, {name}! 🎉
        </h2>
        
        <p style="color: #64748b; font-size: 18px; margin: 0 0 30px 0;">
            Your AI-powered job search companion is ready
        </p>
        
        <div style="text-align: center; margin: 40px 0;">
            <a href="https://applytide.com/dashboard" class="btn">
                Open Dashboard →
            </a>
        </div>
        
        <div style="background: {BRAND_COLORS['light']}; border-left: 4px solid {BRAND_COLORS['primary']}; padding: 25px; border-radius: 12px; margin: 30px 0;">
            <h3 style="color: {BRAND_COLORS['primary']}; margin: 0 0 20px 0; font-size: 20px; font-weight: 700;">
                🚀 Your Job Search Workflow
            </h3>
            
            <div style="margin-bottom: 25px;">
                <div style="display: flex; align-items: start; margin-bottom: 20px;">
                    <div style="background: {BRAND_COLORS['primary']}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; margin-right: 15px;">1</div>
                    <div>
                        <h4 style="color: {BRAND_COLORS['dark']}; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                            Find & Save Jobs
                        </h4>
                        <p style="color: #64748b; margin: 0; line-height: 1.6; font-size: 14px;">
                            <strong>Chrome Extension:</strong> Install our extension and save jobs with one click while browsing LinkedIn, Indeed, or any job board. It auto-extracts all job details.<br>
                            <strong>Manual Entry:</strong> Or add jobs manually from the Job Board page.
                        </p>
                    </div>
                </div>
                
                <div style="display: flex; align-items: start; margin-bottom: 20px;">
                    <div style="background: {BRAND_COLORS['primary']}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; margin-right: 15px;">2</div>
                    <div>
                        <h4 style="color: {BRAND_COLORS['dark']}; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                            Optimize Your Resume with AI
                        </h4>
                        <p style="color: #64748b; margin: 0; line-height: 1.6; font-size: 14px;">
                            Go to <strong>Documents</strong> → Upload your resume → Click "Analyze with Job" to get AI-powered suggestions on how to tailor your resume for each specific role. The AI compares your resume against the job requirements and suggests improvements.
                        </p>
                    </div>
                </div>
                
                <div style="display: flex; align-items: start; margin-bottom: 20px;">
                    <div style="background: {BRAND_COLORS['primary']}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; margin-right: 15px;">3</div>
                    <div>
                        <h4 style="color: {BRAND_COLORS['dark']}; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                            Generate Custom Cover Letters
                        </h4>
                        <p style="color: #64748b; margin: 0; line-height: 1.6; font-size: 14px;">
                            Still in Documents, click <strong>"Generate Cover Letter"</strong> to create a tailored cover letter that matches both the job requirements and your resume. Our AI writes it for you in seconds.
                        </p>
                    </div>
                </div>
                
                <div style="display: flex; align-items: start; margin-bottom: 20px;">
                    <div style="background: {BRAND_COLORS['primary']}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; margin-right: 15px;">4</div>
                    <div>
                        <h4 style="color: {BRAND_COLORS['dark']}; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                            Track Your Applications
                        </h4>
                        <p style="color: #64748b; margin: 0; line-height: 1.6; font-size: 14px;">
                            After applying, go to the <strong>Pipeline</strong> page to track your application status. Move applications through stages: Applied → Phone Screen → Interview → Offer. Visualize your entire job search journey.
                        </p>
                    </div>
                </div>
                
                <div style="display: flex; align-items: start;">
                    <div style="background: {BRAND_COLORS['primary']}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; margin-right: 15px;">5</div>
                    <div>
                        <h4 style="color: {BRAND_COLORS['dark']}; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                            Never Miss Important Dates
                        </h4>
                        <p style="color: #64748b; margin: 0; line-height: 1.6; font-size: 14px;">
                            Set <strong>Reminders</strong> for interviews, deadlines, or follow-ups. Enable email notifications and choose when to be reminded (1 hour before, 1 day before, etc.). Syncs with Google Calendar automatically.
                        </p>
                    </div>
                </div>
            </div>
        </div>
        
        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 12px; margin: 30px 0;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <div style="font-size: 32px; margin-right: 15px;">💡</div>
                <h3 style="color: {BRAND_COLORS['primary']}; margin: 0; font-size: 18px; font-weight: 700;">Pro Tips</h3>
            </div>
            <ul style="color: #475569; margin: 0; padding-left: 20px; line-height: 1.8; font-size: 14px;">
                <li><strong>Install the Chrome Extension first</strong> - It's the fastest way to build your job list</li>
                <li><strong>Always analyze before applying</strong> - Get AI insights to improve your resume for each job</li>
                <li><strong>Use the Pipeline view</strong> - Track which stage each application is in and spot patterns</li>
                <li><strong>Check Analytics later</strong> - Once you have data, see your application trends, response rates, and optimize your strategy</li>
            </ul>
        </div>
        
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">🎯</div>
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 18px; font-weight: 700;">
                Quick Start: Install Extension
            </h3>
            <p style="color: #78350f; margin: 0 0 15px 0; line-height: 1.6;">
                The fastest way to get started is installing our Chrome extension. Save jobs from any website with one click!
            </p>
            <a href="https://chrome.google.com/webstore" style="display: inline-block; color: #92400e; text-decoration: none; font-weight: 600;">
                Get Chrome Extension →
            </a>
        </div>
        
        <div class="divider"></div>
        
        <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0; text-align: center; line-height: 1.6;">
            Questions? We're here to help! �<br>
            <span style="font-size: 12px;">Reply to this email anytime</span>
        </p>
    """
    
    return base_template(content, preview_text=f"Welcome to Applytide, {name}! Let's get you started 🚀")


def password_changed_email(name: str) -> str:
    """Security alert when password is changed"""
    content = f"""
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 50%; line-height: 80px; font-size: 40px; margin-bottom: 20px;">
                🔐
            </div>
        </div>
        
        <h2 style="color: {BRAND_COLORS['dark']}; font-size: 26px; font-weight: 700; margin: 0 0 10px 0; text-align: center;">
            Password Changed Successfully
        </h2>
        
        <p style="color: #64748b; font-size: 16px; margin: 0 0 30px 0; text-align: center;">
            Hi {name}, your Applytide password was just changed
        </p>
        
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-left: 4px solid {BRAND_COLORS['success']}; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <p style="color: {BRAND_COLORS['success']}; margin: 0; font-weight: 600; font-size: 16px;">
                ✓ Your password was successfully updated
            </p>
            <p style="color: #475569; margin: 10px 0 0 0; font-size: 14px;">
                Changed on: {'{datetime}'}
            </p>
        </div>
        
        <div style="background: #fef2f2; border-left: 4px solid {BRAND_COLORS['danger']}; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: {BRAND_COLORS['danger']}; margin: 0 0 10px 0; font-size: 16px;">
                ⚠️ Didn't make this change?
            </h3>
            <p style="color: #475569; margin: 0 0 15px 0; line-height: 1.6;">
                If you didn't request this password change, your account may be compromised. 
                Please secure your account immediately.
            </p>
            <a href="https://applytide.com/auth/reset" class="btn" style="background: {BRAND_COLORS['danger']};">
                Reset Password Now
            </a>
        </div>
        
        <div class="divider"></div>
        
        <div style="background: {BRAND_COLORS['light']}; padding: 20px; border-radius: 8px; margin: 20px 0 0 0;">
            <h4 style="color: {BRAND_COLORS['dark']}; margin: 0 0 15px 0; font-size: 16px;">
                🛡️ Security Tips
            </h4>
            <ul style="color: #475569; margin: 0; padding-left: 20px; line-height: 1.8; font-size: 14px;">
                <li>Use a unique, strong password</li>
                <li>Never share your password with anyone</li>
                <li>Enable two-factor authentication (coming soon!)</li>
                <li>Watch out for phishing emails</li>
            </ul>
        </div>
        
        <p style="color: #64748b; font-size: 14px; margin: 30px 0 0 0; text-align: center;">
            Questions? Contact us at <a href="mailto:security@applytide.com" style="color: {BRAND_COLORS['primary']}; text-decoration: none;">security@applytide.com</a>
        </p>
    """
    
    return base_template(content, preview_text="Your Applytide password was changed")


def account_deleted_email(name: str) -> str:
    """Confirmation email after account deletion"""
    content = f"""
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 50%; line-height: 80px; font-size: 40px; margin-bottom: 20px;">
                👋
            </div>
        </div>
        
        <h2 style="color: {BRAND_COLORS['dark']}; font-size: 26px; font-weight: 700; margin: 0 0 10px 0; text-align: center;">
            Account Deleted
        </h2>
        
        <p style="color: #64748b; font-size: 16px; margin: 0 0 30px 0; text-align: center;">
            Sorry to see you go, {name}
        </p>
        
        <div style="background: {BRAND_COLORS['light']}; border-left: 4px solid {BRAND_COLORS['danger']}; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <p style="color: #475569; margin: 0; line-height: 1.6;">
                Your Applytide account and all associated data have been permanently deleted from our servers.
                This includes:
            </p>
            <ul style="color: #475569; margin: 15px 0 0 0; padding-left: 20px; line-height: 1.8;">
                <li>All job applications and tracking data</li>
                <li>Saved jobs and documents</li>
                <li>Reminders and preferences</li>
                <li>Profile information</li>
            </ul>
        </div>
        
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 30px 0;">
            <h3 style="color: #78350f; margin: 0 0 10px 0; font-size: 18px;">
                💡 Changed your mind?
            </h3>
            <p style="color: #78350f; margin: 0 0 15px 0; line-height: 1.6;">
                You can create a new account anytime. Your previous data cannot be recovered, but you can start fresh!
            </p>
            <a href="https://applytide.com/login" class="btn-secondary" style="display: inline-block; padding: 12px 24px; background: white; color: #78350f !important; text-decoration: none; border-radius: 8px; font-weight: 600; border: 2px solid #78350f;">
                Create New Account
            </a>
        </div>
        
        <div class="divider"></div>
        
        <div style="background: {BRAND_COLORS['light']}; padding: 20px; border-radius: 8px; margin: 20px 0 0 0;">
            <h4 style="color: {BRAND_COLORS['dark']}; margin: 0 0 15px 0; font-size: 16px;">
                📢 We'd love your feedback
            </h4>
            <p style="color: #475569; margin: 0 0 15px 0; line-height: 1.6; font-size: 14px;">
                Help us improve! Let us know why you left and what we could do better.
            </p>
            <a href="mailto:feedback@applytide.com?subject=Feedback from deleted account" 
               style="color: {BRAND_COLORS['primary']}; text-decoration: none; font-weight: 600;">
                Send Feedback →
            </a>
        </div>
        
        <p style="color: #64748b; font-size: 13px; margin: 30px 0 0 0; text-align: center; line-height: 1.6;">
            This is the last email you'll receive from us.<br>
            If you have any questions, contact <a href="mailto:privacy@applytide.com" style="color: {BRAND_COLORS['primary']}; text-decoration: none;">privacy@applytide.com</a>
        </p>
    """
    
    return base_template(content, preview_text="Your Applytide account has been deleted")


def reminder_email(
    name: str,
    title: str,
    description: str,
    due_date: str,
    time_until: str,
    urgency: str,
    event_type: str,
    action_url: str
) -> str:
    """
    Beautiful, professional reminder email with dynamic urgency styling
    urgency: 'now', 'today', 'tomorrow', 'week', 'future'
    event_type: 'interview', 'deadline', 'follow-up', 'general'
    """
    
    # Urgency-based styling - professional color scheme
    urgency_config = {
        'now': {
            'emoji': '🚨',
            'title': 'HAPPENING NOW',
            'color': '#dc2626',
            'bg': '#fef2f2',
            'card_bg': '#fee2e2',
            'border': '#dc2626',
            'message': 'This is happening right now!'
        },
        'today': {
            'emoji': '⏰',
            'title': 'DUE TODAY',
            'color': '#ea580c',
            'bg': '#fff7ed',
            'card_bg': '#ffedd5',
            'border': '#ea580c',
            'message': 'This is coming up today!'
        },
        'tomorrow': {
            'emoji': '📅',
            'title': 'TOMORROW',
            'color': '#2563eb',
            'bg': '#eff6ff',
            'card_bg': '#dbeafe',
            'border': '#2563eb',
            'message': 'This is coming up tomorrow!'
        },
        'week': {
            'emoji': '📌',
            'title': 'THIS WEEK',
            'color': '#7c3aed',
            'bg': '#f5f3ff',
            'card_bg': '#ede9fe',
            'border': '#7c3aed',
            'message': f'Coming up in {time_until}'
        },
        'future': {
            'emoji': '🔔',
            'title': 'UPCOMING',
            'color': '#059669',
            'bg': '#f0fdf4',
            'card_bg': '#d1fae5',
            'border': '#059669',
            'message': f'Coming up in {time_until}'
        }
    }
    
    # Event type styling
    event_icons = {
        'interview': '🎯',
        'deadline': '⚡',
        'follow-up': '📧',
        'general': '📋'
    }
    
    config = urgency_config.get(urgency, urgency_config['future'])
    event_icon = event_icons.get(event_type, '📋')
    
    content = f"""
        <!-- Urgency Badge -->
        <div style="text-align: center; margin-bottom: 35px;">
            <div style="display: inline-block; background: {config['bg']}; padding: 15px 20px; border-radius: 50%; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">
                <span style="font-size: 48px; line-height: 1;">{config['emoji']}</span>
            </div>
            <div style="display: block; margin-top: 15px;">
                <span style="display: inline-block; background: {config['color']}; color: white; padding: 10px 24px; border-radius: 25px; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
                    {config['title']}
                </span>
            </div>
        </div>
        
        <!-- Main Title -->
        <h2 style="color: #0f172a; font-size: 32px; font-weight: 700; margin: 0 0 15px 0; text-align: center; line-height: 1.2;">
            {title}
        </h2>
        
        <!-- Greeting Message -->
        <p style="color: #64748b; font-size: 17px; margin: 0 0 40px 0; text-align: center; line-height: 1.6;">
            Hey {name}, {config['message']}
        </p>
        
        <!-- Event Card -->
        <div style="background: white; border: 2px solid {config['border']}; border-radius: 16px; padding: 35px 30px; margin: 35px 0; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);">
            
            {f'<p style="color: #334155; margin: 0 0 30px 0; line-height: 1.8; font-size: 17px; text-align: center; font-weight: 500;">{description}</p>' if description else ''}
            
            <!-- Date & Time Card -->
            <div style="background: {config['card_bg']}; padding: 30px 25px; border-radius: 12px; border: 1px solid {config['border']};">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                    <tr>
                        <td style="width: 50%; padding: 15px; text-align: center; border-right: 2px solid {config['border']};">
                            <div style="margin-bottom: 10px;">
                                <span style="font-size: 28px;">📅</span>
                            </div>
                            <p style="color: #64748b; margin: 0 0 8px 0; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                                Due Date
                            </p>
                            <p style="color: #0f172a; margin: 0; font-size: 16px; font-weight: 700; line-height: 1.5;">
                                {due_date}
                            </p>
                        </td>
                        <td style="width: 50%; padding: 15px; text-align: center;">
                            <div style="margin-bottom: 10px;">
                                <span style="font-size: 28px;">⏱️</span>
                            </div>
                            <p style="color: #64748b; margin: 0 0 8px 0; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                                Time Left
                            </p>
                            <p style="color: {config['color']}; margin: 0; font-size: 19px; font-weight: 800; line-height: 1.5;">
                                {time_until}
                            </p>
                        </td>
                    </tr>
                </table>
            </div>
        </div>
        
        <!-- Call-to-Action Button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 40px 0 35px;">
            <tr>
                <td align="center">
                    <a href="{action_url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 18px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 8px 20px rgba(102, 126, 234, 0.35); transition: all 0.3s;">
                        View Application →
                    </a>
                </td>
            </tr>
        </table>
        
        <!-- Divider -->
        <div style="height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); margin: 35px 0;"></div>
        
        <!-- Footer Tip -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
            <tr>
                <td align="center">
                    <p style="color: #94a3b8; font-size: 15px; margin: 0 0 15px 0; line-height: 1.6;">
                        💡 <strong style="color: #64748b;">Pro Tip:</strong> Set multiple reminders to never miss important deadlines!
                    </p>
                    <p style="color: #64748b; font-size: 14px; margin: 0;">
                        Manage all reminders in your 
                        <a href="https://applytide.com/reminders" style="color: #667eea; text-decoration: none; font-weight: 600;">
                            Dashboard →
                        </a>
                    </p>
                </td>
            </tr>
        </table>
    """
    
    return base_template(content, preview_text=f"⏰ {title} - {config['title']}")
