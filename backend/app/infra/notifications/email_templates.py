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
    'dark': '#1e293b',         # Slate - dark text
    'light': '#f8fafc',        # Slate - light bg
    'gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
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
            background: linear-gradient(180deg, {BRAND_COLORS['light']} 0%, #e2e8f0 100%);
            padding: 40px 20px;
        }}
        
        .email-container {{
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }}
        
        .email-header {{
            background: {BRAND_COLORS['gradient']};
            padding: 40px 30px;
            text-align: center;
        }}
        
        .logo-container {{
            width: 64px;
            height: 64px;
            background: white;
            border-radius: 16px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }}
        
        .logo-text {{
            color: {BRAND_COLORS['primary']};
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }}
        
        .brand-name {{
            color: white;
            font-size: 24px;
            font-weight: 600;
            margin: 0;
            letter-spacing: -0.5px;
        }}
        
        .email-body {{
            padding: 40px 30px;
        }}
        
        .email-footer {{
            background: {BRAND_COLORS['dark']};
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
        
        .social-links {{
            margin: 20px 0;
        }}
        
        .social-links a {{
            display: inline-block;
            width: 36px;
            height: 36px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            margin: 0 5px;
            line-height: 36px;
            color: #cbd5e1;
            text-decoration: none;
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
                    <div class="logo-text">AT</div>
                </div>
                <h1 class="brand-name">Applytide</h1>
            </div>
            
            <div class="email-body">
                {content}
            </div>
            
            <div class="email-footer">
                <div class="social-links">
                    <a href="https://twitter.com/applytide" title="Twitter">𝕏</a>
                    <a href="https://linkedin.com/company/applytide" title="LinkedIn">in</a>
                </div>
                
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
            Your journey to landing your dream job starts now
        </p>
        
        <div style="background: {BRAND_COLORS['light']}; border-left: 4px solid {BRAND_COLORS['primary']}; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: {BRAND_COLORS['primary']}; margin: 0 0 10px 0; font-size: 18px;">
                🚀 Quick Start Guide
            </h3>
            <ul style="color: #475569; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li><strong>Track Applications:</strong> Add jobs you're interested in</li>
                <li><strong>Set Reminders:</strong> Never miss a deadline or interview</li>
                <li><strong>Use the Extension:</strong> Save jobs directly from LinkedIn</li>
                <li><strong>View Analytics:</strong> Track your progress with beautiful charts</li>
            </ul>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
            <a href="https://applytide.com/dashboard" class="btn">
                Go to Dashboard →
            </a>
        </div>
        
        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 12px; margin: 30px 0;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <div style="font-size: 32px; margin-right: 15px;">💡</div>
                <h3 style="color: {BRAND_COLORS['primary']}; margin: 0; font-size: 18px;">Pro Tip</h3>
            </div>
            <p style="color: #475569; margin: 0; line-height: 1.6;">
                Install our Chrome extension to save jobs with one click while browsing LinkedIn, Indeed, or any job board!
            </p>
            <a href="https://chrome.google.com/webstore/detail/applytide" 
               style="display: inline-block; margin-top: 15px; color: {BRAND_COLORS['primary']}; text-decoration: none; font-weight: 600;">
                Get Extension →
            </a>
        </div>
        
        <div class="divider"></div>
        
        <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0; text-align: center;">
            Need help? Reply to this email or visit our <a href="https://applytide.com/contact" style="color: {BRAND_COLORS['primary']}; text-decoration: none;">help center</a>
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
    Reminder email with dynamic urgency styling
    urgency: 'now', 'today', 'tomorrow', 'week', 'future'
    event_type: 'interview', 'deadline', 'follow-up', 'general'
    """
    
    # Urgency-based styling
    urgency_config = {
        'now': {
            'emoji': '🚨',
            'title': 'Happening NOW!',
            'color': BRAND_COLORS['danger'],
            'gradient': 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
            'message': 'This is happening right now!'
        },
        'today': {
            'emoji': '⏰',
            'title': 'Today',
            'color': BRAND_COLORS['warning'],
            'gradient': 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            'message': 'This is coming up today!'
        },
        'tomorrow': {
            'emoji': '📅',
            'title': 'Tomorrow',
            'color': BRAND_COLORS['primary'],
            'gradient': 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
            'message': 'This is coming up tomorrow!'
        },
        'week': {
            'emoji': '📌',
            'title': 'This Week',
            'color': BRAND_COLORS['secondary'],
            'gradient': 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
            'message': f'Coming up in {time_until}'
        },
        'future': {
            'emoji': '🔔',
            'title': 'Upcoming',
            'color': BRAND_COLORS['success'],
            'gradient': 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
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
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 80px; height: 80px; background: {config['gradient']}; border-radius: 50%; line-height: 80px; font-size: 40px; margin-bottom: 20px;">
                {config['emoji']}
            </div>
        </div>
        
        <h2 style="color: {BRAND_COLORS['dark']}; font-size: 26px; font-weight: 700; margin: 0 0 10px 0; text-align: center;">
            Reminder: {config['title']}
        </h2>
        
        <p style="color: #64748b; font-size: 16px; margin: 0 0 30px 0; text-align: center;">
            Hi {name}, {config['message']}
        </p>
        
        <div style="background: white; border: 2px solid {config['color']}; border-radius: 12px; padding: 30px; margin: 30px 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <div style="font-size: 32px; margin-right: 15px;">{event_icon}</div>
                <h3 style="color: {BRAND_COLORS['dark']}; margin: 0; font-size: 22px; font-weight: 700;">
                    {title}
                </h3>
            </div>
            
            {f'<p style="color: #475569; margin: 0 0 20px 0; line-height: 1.6; font-size: 16px;">{description}</p>' if description else ''}
            
            <div style="background: {config['gradient']}; padding: 15px 20px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p style="color: {config['color']}; margin: 0; font-weight: 600; font-size: 14px;">
                            Due Date
                        </p>
                        <p style="color: {BRAND_COLORS['dark']}; margin: 5px 0 0 0; font-size: 18px; font-weight: 700;">
                            {due_date}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <p style="color: {config['color']}; margin: 0; font-weight: 600; font-size: 14px;">
                            Time Left
                        </p>
                        <p style="color: {BRAND_COLORS['dark']}; margin: 5px 0 0 0; font-size: 18px; font-weight: 700;">
                            {time_until}
                        </p>
                    </div>
                </div>
            </div>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
            <a href="{action_url}" class="btn" style="background: {config['color']};">
                View Details →
            </a>
        </div>
        
        <div class="divider"></div>
        
        <p style="color: #64748b; font-size: 13px; margin: 20px 0 0 0; text-align: center;">
            Manage your reminders in your <a href="https://applytide.com/reminders" style="color: {BRAND_COLORS['primary']}; text-decoration: none;">Reminders dashboard</a>
        </p>
    """
    
    return base_template(content, preview_text=f"Reminder: {title} - {config['title']}")
