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
    """Modern, clean email template with strategic color accents"""
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <title>Applytide</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background: #f5f5f7;
        }}
        
        /* Full-width wrapper */
        .email-wrapper {{
            width: 100%;
            background: #f5f5f7;
            padding: 40px 20px;
        }}
        
        /* Container */
        .email-container {{
            max-width: 680px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
        }}
        
        /* Header - Gradient */
        .email-header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 50px 40px;
            text-align: center;
            position: relative;
        }}
        
        .logo-container {{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin-bottom: 12px;
        }}
        
        .logo-img {{
            height: 60px;
            width: auto;
        }}
        
        .brand-name {{
            color: white;
            font-size: 36px;
            font-weight: 800;
            margin: 0;
            letter-spacing: -0.5px;
        }}
        
        .tagline {{
            color: rgba(255, 255, 255, 0.95);
            font-size: 14px;
            font-weight: 500;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin: 0;
        }}
        
        /* Content Area */
        .email-body {{
            padding: 50px 40px;
            background: #ffffff;
        }}
        
        /* Typography */
        h1 {{
            color: #1a1a1a;
            font-size: 32px;
            font-weight: 800;
            margin: 0 0 16px 0;
            line-height: 1.2;
            letter-spacing: -0.5px;
        }}
        
        h2 {{
            color: #1a1a1a;
            font-size: 26px;
            font-weight: 700;
            margin: 0 0 14px 0;
            line-height: 1.3;
        }}
        
        h3 {{
            color: #1a1a1a;
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 10px 0;
            line-height: 1.4;
        }}
        
        p {{
            color: #4a4a4a;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 16px 0;
        }}
        
        /* Modern Card */
        .modern-card {{
            background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
            border: 1px solid #e0e7ff;
            border-radius: 16px;
            padding: 32px;
            margin: 32px 0;
        }}
        
        /* Accent Card - Colorful */
        .accent-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 16px;
            padding: 36px;
            margin: 32px 0;
            color: white;
        }}
        
        .accent-card h2,
        .accent-card h3,
        .accent-card p {{
            color: white;
        }}
        
        /* Light Card with Border */
        .light-card {{
            background: #ffffff;
            border: 2px solid #f0f0f0;
            border-radius: 14px;
            padding: 28px;
            margin: 20px 0;
            transition: border-color 0.3s;
        }}
        
        .light-card:hover {{
            border-color: #667eea;
        }}
        
        /* Stats Grid - Clean & Minimal */
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 32px 0;
        }}
        
        .stat-card {{
            background: #ffffff;
            border: 2px solid #f0f0f0;
            border-radius: 14px;
            padding: 28px;
            text-align: center;
        }}
        
        .stat-icon {{
            font-size: 40px;
            margin-bottom: 12px;
        }}
        
        .stat-label {{
            font-size: 12px;
            color: #8a8a8a;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
            margin-bottom: 8px;
        }}
        
        .stat-value {{
            font-size: 28px;
            font-weight: 800;
            color: #1a1a1a;
            margin: 0;
        }}
        
        /* Button - Modern & Clean */
        .btn {{
            display: inline-block;
            padding: 16px 36px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 700;
            font-size: 16px;
            box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
        }}
        
        .btn:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }}
        
        /* Badge */
        .badge {{
            display: inline-block;
            padding: 8px 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        
        .badge-success {{
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }}
        
        .badge-warning {{
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }}
        
        .badge-danger {{
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }}
        
        /* Alert Boxes - Clean & Colorful */
        .alert {{
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            border-left: 4px solid;
        }}
        
        .alert-success {{
            background: #f0fdf4;
            border-color: #10b981;
        }}
        
        .alert-success h3 {{
            color: #059669;
        }}
        
        .alert-success p {{
            color: #047857;
        }}
        
        .alert-warning {{
            background: #fffbeb;
            border-color: #f59e0b;
        }}
        
        .alert-warning h3 {{
            color: #d97706;
        }}
        
        .alert-warning p {{
            color: #b45309;
        }}
        
        .alert-danger {{
            background: #fef2f2;
            border-color: #ef4444;
        }}
        
        .alert-danger h3 {{
            color: #dc2626;
        }}
        
        .alert-danger p {{
            color: #b91c1c;
        }}
        
        .alert-info {{
            background: #eff6ff;
            border-color: #3b82f6;
        }}
        
        .alert-info h3 {{
            color: #2563eb;
        }}
        
        .alert-info p {{
            color: #1d4ed8;
        }}
        
        /* Timeline - Clean */
        .timeline-item {{
            display: flex;
            gap: 20px;
            margin: 24px 0;
            position: relative;
        }}
        
        .timeline-number {{
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 800;
            font-size: 16px;
        }}
        
        .timeline-content {{
            flex: 1;
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
        }}
        
        .timeline-content h4 {{
            color: #1a1a1a;
            font-size: 16px;
            font-weight: 700;
            margin: 0 0 8px 0;
        }}
        
        .timeline-content p {{
            color: #4a4a4a;
            font-size: 14px;
            margin: 0;
        }}
        
        .timeline-item:not(:last-child)::after {{
            content: '';
            position: absolute;
            left: 20px;
            top: 40px;
            width: 2px;
            height: calc(100% - 16px);
            background: linear-gradient(180deg, #667eea, #764ba2);
            opacity: 0.3;
        }}
        
        /* Divider */
        .divider {{
            height: 1px;
            background: linear-gradient(90deg, transparent, #e0e0e0, transparent);
            margin: 40px 0;
        }}
        
        /* Footer */
        .email-footer {{
            background: #f8f9fa;
            padding: 40px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
        }}
        
        .footer-logo {{
            font-size: 24px;
            font-weight: 800;
            color: #1a1a1a;
            margin: 0 0 8px 0;
        }}
        
        .footer-tagline {{
            color: #8a8a8a;
            font-size: 13px;
            margin: 0 0 24px 0;
        }}
        
        .footer-links {{
            margin: 24px 0;
        }}
        
        .footer-links a {{
            color: #4a4a4a;
            text-decoration: none;
            margin: 0 12px;
            font-weight: 600;
            font-size: 13px;
            transition: color 0.3s;
        }}
        
        .footer-links a:hover {{
            color: #667eea;
        }}
        
        .footer-copyright {{
            color: #8a8a8a;
            font-size: 12px;
            margin: 24px 0 0 0;
            line-height: 1.6;
        }}
        
        /* Responsive */
        @media only screen and (max-width: 600px) {{
            .email-header,
            .email-body,
            .email-footer {{
                padding: 32px 24px;
            }}
            
            .brand-name {{
                font-size: 28px;
            }}
            
            h1 {{
                font-size: 26px;
            }}
            
            h2 {{
                font-size: 22px;
            }}
            
            .stats-grid {{
                grid-template-columns: 1fr;
                gap: 16px;
            }}
            
            .modern-card,
            .accent-card,
            .light-card {{
                padding: 24px 20px;
            }}
            
            .btn {{
                width: 100%;
                padding: 14px 28px;
            }}
            
            .timeline-item {{
                flex-direction: column;
                gap: 12px;
            }}
            
            .timeline-item:not(:last-child)::after {{
                display: none;
            }}
        }}
    </style>
</head>
<body>
    <!-- Preview Text -->
    <div style="display:none;font-size:1px;color:#1a1a1a;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        {preview_text}
    </div>
    
    <!-- Email Wrapper -->
    <div class="email-wrapper">
        
        <!-- Container -->
        <div class="email-container">
            
            <!-- Header -->
            <div class="email-header">
                <div class="logo-container">
                    <img src="https://applytide.com/images/logomark.png" alt="Applytide" class="logo-img" />
                    <h1 class="brand-name">Applytide</h1>
                </div>
                <p class="tagline">AI-Powered Job Tracking</p>
            </div>
            
            <!-- Body -->
            <div class="email-body">
                {content}
            </div>
            
            <!-- Footer -->
            <div class="email-footer">
                <p class="footer-logo">Applytide</p>
                <p class="footer-tagline">Your AI-Powered Job Application Tracker</p>
                
                <div class="footer-links">
                    <a href="https://applytide.com">Home</a>
                    <a href="https://applytide.com/dashboard">Dashboard</a>
                    <a href="https://applytide.com/privacy">Privacy</a>
                    <a href="https://applytide.com/contact">Contact</a>
                </div>
                
                <p class="footer-copyright">
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
    action_url: str,
    ai_prep_tips_html: str = None
) -> str:
    """
    Clean, modern reminder email with optional AI prep tips
    urgency: 'now', 'today', 'tomorrow', 'week', 'future'
    event_type: 'interview', 'deadline', 'follow-up', 'general'
    ai_prep_tips_html: Optional HTML content with AI-generated prep tips (Pro/Premium feature)
    """
    
    # Urgency-based styling - clean & minimal
    urgency_config = {
        'now': {
            'emoji': '🚨',
            'title': 'HAPPENING NOW',
            'badge_class': 'badge-danger',
            'message': 'This is happening right now!'
        },
        'today': {
            'emoji': '⏰',
            'title': 'DUE TODAY',
            'badge_class': 'badge-warning',
            'message': 'This is coming up today!'
        },
        'tomorrow': {
            'emoji': '📅',
            'title': 'TOMORROW',
            'badge_class': 'badge',
            'message': 'This is coming up tomorrow!'
        },
        'week': {
            'emoji': '📌',
            'title': 'THIS WEEK',
            'badge_class': 'badge',
            'message': f'Coming up in {time_until}'
        },
        'future': {
            'emoji': '🔔',
            'title': 'UPCOMING',
            'badge_class': 'badge-success',
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
        <!-- Hero Badge Section -->
        <div style="text-align: center; margin: 0 0 40px 0;">
            <span class="{config['badge_class']}">{config['emoji']} {config['title']}</span>
            <h1 style="margin-top: 24px;">{title}</h1>
            <p style="font-size: 16px; color: #8a8a8a; margin-top: 12px;">
                Hey {name}, {config['message']}
            </p>
        </div>
        
        <!-- Main Event Card -->
        <div class="modern-card">
            <div style="text-align: center; margin-bottom: 28px;">
                <div style="font-size: 56px; margin-bottom: 16px;">{event_icon}</div>
            </div>
            
            {f'<p style="color: #4a4a4a; font-size: 16px; line-height: 1.7; text-align: center; margin-bottom: 32px;">{description}</p>' if description else ''}
            
            <!-- Date & Time Stats Grid -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">📅</div>
                    <p class="stat-label">Due Date</p>
                    <p class="stat-value" style="font-size: 18px; margin-top: 8px;">{due_date}</p>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⏱️</div>
                    <p class="stat-label">Time Left</p>
                    <p class="stat-value" style="font-size: 20px; margin-top: 8px; color: #667eea;">{time_until}</p>
                </div>
            </div>
        </div>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 40px 0;">
            <a href="{action_url}" class="btn">View Application →</a>
        </div>
        
        {f'''
        <!-- AI Preparation Tips Section (Pro/Premium Feature) -->
        <div class="divider"></div>
        
        <div class="accent-card" style="margin: 40px 0;">
            <div style="text-align: center; margin-bottom: 32px;">
                <div style="font-size: 56px; margin-bottom: 16px;">🤖</div>
                <h2 style="color: white; margin-bottom: 8px;">AI-Powered Interview Prep</h2>
                <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 0;">
                    ✨ Personalized just for you • Generated with GPT-4
                </p>
            </div>
        </div>
        
        {ai_prep_tips_html}
        
        <div style="text-align: center; margin: 32px 0;">
            <span class="badge" style="padding: 10px 20px; font-size: 13px;">
                💎 Pro Feature
            </span>
        </div>
        ''' if ai_prep_tips_html else ''}
        
        <!-- Divider -->
        <div class="divider"></div>
        
        <!-- Footer Tip -->
        <div style="text-align: center; margin-top: 32px;">
            <p style="color: #8a8a8a; font-size: 15px; margin: 0 0 12px 0;">
                💡 <strong style="color: #4a4a4a;">Pro Tip:</strong> Set multiple reminders to never miss important deadlines!
            </p>
            <p style="color: #8a8a8a; font-size: 14px; margin: 0;">
                Manage all reminders in your 
                <a href="https://applytide.com/reminders" style="color: #667eea; text-decoration: none; font-weight: 600;">
                    Dashboard →
                </a>
            </p>
        </div>
    """
    
    return base_template(content, preview_text=f"{config['emoji']} {title} - {config['title']}")


def deletion_confirmation_email(name: str, deletion_date: str, recovery_token: str, recovery_url: str) -> str:
    """Account deletion confirmation with 7-day recovery period"""
    content = f"""
        <!-- Warning Icon -->
        <div style="text-align: center; margin-bottom: 35px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); padding: 25px; border-radius: 50%; margin-bottom: 15px; box-shadow: 0 8px 20px rgba(239, 68, 68, 0.25);">
                <span style="font-size: 56px; line-height: 1;">⚠️</span>
            </div>
            <div style="display: block; margin-top: 15px;">
                <span style="display: inline-block; background: {BRAND_COLORS['danger']}; color: white; padding: 10px 24px; border-radius: 25px; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
                    ACCOUNT DELETION SCHEDULED
                </span>
            </div>
        </div>
        
        <!-- Main Title -->
        <h2 style="color: {BRAND_COLORS['danger']}; font-size: 32px; font-weight: 700; margin: 0 0 15px 0; text-align: center; line-height: 1.2;">
            Your Account Will Be Deleted
        </h2>
        
        <!-- Greeting -->
        <p style="color: #64748b; font-size: 17px; margin: 0 0 40px 0; text-align: center; line-height: 1.6;">
            Hi {name}, we've received your request to delete your Applytide account.
        </p>
        
        <!-- Deletion Date Card -->
        <div style="background: #fef2f2; border: 2px solid {BRAND_COLORS['danger']}; border-radius: 16px; padding: 35px 30px; margin: 35px 0; box-shadow: 0 4px 16px rgba(239, 68, 68, 0.15);">
            <div style="text-align: center;">
                <p style="color: #64748b; margin: 0 0 12px 0; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Deletion Date
                </p>
                <p style="color: {BRAND_COLORS['danger']}; margin: 0; font-size: 28px; font-weight: 800; line-height: 1.4;">
                    {deletion_date}
                </p>
            </div>
        </div>
        
        <!-- Recovery Section -->
        <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid {BRAND_COLORS['neon_blue']}; border-radius: 16px; padding: 35px 30px; margin: 35px 0; box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);">
            <div style="text-align: center; margin-bottom: 25px;">
                <span style="font-size: 48px; line-height: 1;">🔄</span>
            </div>
            
            <h3 style="color: {BRAND_COLORS['neon_blue']}; margin: 0 0 15px 0; font-size: 24px; font-weight: 700; text-align: center;">
                Changed Your Mind?
            </h3>
            
            <p style="color: #1e40af; margin: 0 0 30px 0; line-height: 1.8; font-size: 16px; text-align: center; font-weight: 500;">
                You have <strong style="font-size: 20px; color: {BRAND_COLORS['neon_blue']};">7 days</strong> to recover your account.<br>
                Click the button below or simply log in to cancel the deletion.
            </p>
            
            <!-- Recovery Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center">
                        <a href="{recovery_url}" style="display: inline-block; background: {BRAND_COLORS['neon_blue']}; color: white !important; padding: 18px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4); transition: all 0.3s;">
                            🔄 Recover My Account
                        </a>
                    </td>
                </tr>
            </table>
            
            <!-- Recovery Link -->
            <p style="color: #1e40af; font-size: 13px; margin: 20px 0 0 0; text-align: center; line-height: 1.6;">
                Or copy this link:<br>
                <a href="{recovery_url}" style="color: {BRAND_COLORS['neon_blue']}; text-decoration: none; word-break: break-all; font-family: monospace; font-size: 12px;">
                    {recovery_url}
                </a>
            </p>
        </div>
        
        <!-- What Will Be Deleted -->
        <div style="background: {BRAND_COLORS['light']}; border-left: 4px solid #94a3b8; padding: 30px; border-radius: 12px; margin: 35px 0;">
            <h3 style="color: {BRAND_COLORS['dark']}; margin: 0 0 20px 0; font-size: 20px; font-weight: 700;">
                📋 What Will Be Deleted
            </h3>
            <ul style="color: #475569; margin: 0; padding-left: 20px; line-height: 2; font-size: 15px;">
                <li><strong>All resumes and documents</strong> - Your uploaded files and generated content</li>
                <li><strong>Job applications and analytics</strong> - All saved jobs and tracking data</li>
                <li><strong>Profile and preferences</strong> - Your personal information and settings</li>
                <li><strong>Reminders and calendar events</strong> - All scheduled notifications</li>
            </ul>
            
            <div style="background: white; border-left: 4px solid {BRAND_COLORS['danger']}; padding: 20px; border-radius: 8px; margin-top: 25px;">
                <p style="color: {BRAND_COLORS['danger']}; margin: 0; font-weight: 700; font-size: 16px;">
                    ⚠️ After 7 days, all data will be permanently deleted and cannot be recovered.
                </p>
            </div>
        </div>
        
        <!-- Divider -->
        <div style="height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); margin: 40px 0;"></div>
        
        <!-- Security Notice -->
        <div style="background: #fff7ed; border-left: 4px solid {BRAND_COLORS['warning']}; padding: 25px; border-radius: 12px; margin: 30px 0;">
            <p style="color: #78350f; margin: 0; line-height: 1.8; font-size: 15px;">
                <strong style="font-size: 16px;">🔒 Security Notice:</strong><br>
                If you didn't request this deletion, please contact us immediately at 
                <a href="mailto:support@applytide.com" style="color: {BRAND_COLORS['warning']}; text-decoration: none; font-weight: 600;">support@applytide.com</a>
            </p>
        </div>
        
        <!-- Footer Message -->
        <p style="color: #64748b; font-size: 14px; margin: 30px 0 0 0; text-align: center; line-height: 1.6;">
            Need help? Reply to this email or contact 
            <a href="mailto:support@applytide.com" style="color: {BRAND_COLORS['primary']}; text-decoration: none; font-weight: 600;">support@applytide.com</a>
        </p>
    """
    
    return base_template(content, preview_text=f"Your Applytide account will be deleted in 7 days - Recover now")


def recovery_success_email(name: str) -> str:
    """Account recovery success confirmation"""
    content = f"""
        <!-- Success Icon -->
        <div style="text-align: center; margin-bottom: 35px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 25px; border-radius: 50%; margin-bottom: 15px; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.25);">
                <span style="font-size: 56px; line-height: 1;">✓</span>
            </div>
            <div style="display: block; margin-top: 15px;">
                <span style="display: inline-block; background: {BRAND_COLORS['success']}; color: white; padding: 10px 24px; border-radius: 25px; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                    ACCOUNT RECOVERED
                </span>
            </div>
        </div>
        
        <!-- Main Title -->
        <h2 style="color: {BRAND_COLORS['success']}; font-size: 32px; font-weight: 700; margin: 0 0 15px 0; text-align: center; line-height: 1.2;">
            Welcome Back! 🎉
        </h2>
        
        <!-- Greeting -->
        <p style="color: #64748b; font-size: 17px; margin: 0 0 40px 0; text-align: center; line-height: 1.6;">
            Hi {name}, your account has been successfully recovered!
        </p>
        
        <!-- Success Card -->
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid {BRAND_COLORS['success']}; border-radius: 16px; padding: 35px 30px; margin: 35px 0; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.15);">
            <div style="text-align: center;">
                <h3 style="color: {BRAND_COLORS['success']}; margin: 0 0 25px 0; font-size: 24px; font-weight: 700;">
                    Great News!
                </h3>
                
                <div style="background: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                <span style="font-size: 24px; margin-right: 12px;">✅</span>
                                <span style="color: {BRAND_COLORS['success']}; font-weight: 700; font-size: 16px;">
                                    Account deletion cancelled
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                <span style="font-size: 24px; margin-right: 12px;">✅</span>
                                <span style="color: {BRAND_COLORS['success']}; font-weight: 700; font-size: 16px;">
                                    All your data has been preserved
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0;">
                                <span style="font-size: 24px; margin-right: 12px;">✅</span>
                                <span style="color: {BRAND_COLORS['success']}; font-weight: 700; font-size: 16px;">
                                    You can continue using Applytide
                                </span>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
        
        <!-- Dashboard Button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 40px 0 35px;">
            <tr>
                <td align="center">
                    <a href="https://applytide.com/dashboard" style="display: inline-block; background: {BRAND_COLORS['gradient']}; color: white !important; padding: 18px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 8px 20px rgba(102, 126, 234, 0.35); transition: all 0.3s;">
                        Go to Dashboard →
                    </a>
                </td>
            </tr>
        </table>
        
        <!-- Divider -->
        <div style="height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); margin: 40px 0;"></div>
        
        <!-- Security Warning -->
        <div style="background: #fff7ed; border: 2px solid {BRAND_COLORS['warning']}; border-radius: 12px; padding: 30px; margin: 35px 0;">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 40px; line-height: 1;">🔒</span>
            </div>
            
            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 20px; font-weight: 700; text-align: center;">
                Security Notice
            </h3>
            
            <p style="color: #78350f; margin: 0 0 20px 0; line-height: 1.8; font-size: 15px; text-align: center;">
                If you didn't request this account recovery, please take these steps immediately:
            </p>
            
            <div style="background: white; padding: 25px; border-radius: 8px;">
                <ol style="color: #78350f; margin: 0; padding-left: 20px; line-height: 2; font-size: 15px; font-weight: 500;">
                    <li><strong>Change your password</strong> - Update it to a strong, unique password</li>
                    <li><strong>Review your account activity</strong> - Check for any suspicious changes</li>
                    <li><strong>Contact support</strong> - Email us at 
                        <a href="mailto:security@applytide.com" style="color: {BRAND_COLORS['warning']}; text-decoration: none; font-weight: 600;">security@applytide.com</a>
                    </li>
                </ol>
            </div>
        </div>
        
        <!-- Welcome Back Message -->
        <div style="background: {BRAND_COLORS['light']}; padding: 30px; border-radius: 12px; margin: 35px 0; text-align: center;">
            <p style="color: {BRAND_COLORS['dark']}; margin: 0; font-size: 18px; font-weight: 600; line-height: 1.8;">
                We're glad to have you back! 🎊<br>
                <span style="color: #64748b; font-size: 15px; font-weight: 400;">
                    Continue tracking your job applications and land your dream job.
                </span>
            </p>
        </div>
        
        <!-- Footer Message -->
        <p style="color: #64748b; font-size: 14px; margin: 30px 0 0 0; text-align: center; line-height: 1.6;">
            Questions? Reply to this email or contact 
            <a href="mailto:support@applytide.com" style="color: {BRAND_COLORS['primary']}; text-decoration: none; font-weight: 600;">support@applytide.com</a>
        </p>
    """
    
    return base_template(content, preview_text=f"Your Applytide account has been recovered - Welcome back!")


