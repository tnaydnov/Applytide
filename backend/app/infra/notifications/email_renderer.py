"""
Email Rendering Client - Communicates with the Node.js email service
"""
import requests
import logging
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class EmailRendererClient:
    """Client for rendering React Email templates via the email service"""
    
    def __init__(self):
        self.base_url = getattr(settings, 'EMAIL_SERVICE_URL', 'http://email_service:3001')
        self.timeout = 10  # seconds
    
    def render_template(self, template_name: str, data: Dict[str, Any]) -> Optional[str]:
        """
        Render an email template with the given data
        
        Args:
            template_name: Name of the template (e.g., 'ReminderEmail')
            data: Dictionary of data to pass to the template
            
        Returns:
            HTML string if successful, None if failed
        """
        try:
            response = requests.post(
                f'{self.base_url}/render',
                json={'template': template_name, 'data': data},
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('html')
            else:
                logger.error(f"Email service returned {response.status_code}: {response.text}")
                return None
                
        except requests.exceptions.Timeout:
            logger.error(f"Email service timeout after {self.timeout}s")
            return None
        except requests.exceptions.ConnectionError:
            logger.error(f"Cannot connect to email service at {self.base_url}")
            return None
        except Exception as e:
            logger.error(f"Email rendering error: {str(e)}")
            return None
    
    def health_check(self) -> bool:
        """Check if email service is available"""
        try:
            response = requests.get(f'{self.base_url}/health', timeout=2)
            return response.status_code == 200
        except:
            return False
    
    def list_templates(self) -> list:
        """Get list of available templates"""
        try:
            response = requests.get(f'{self.base_url}/templates', timeout=5)
            if response.status_code == 200:
                return response.json().get('templates', [])
            return []
        except:
            return []


# Global instance
email_renderer = EmailRendererClient()
