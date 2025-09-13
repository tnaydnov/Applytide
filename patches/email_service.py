from fastapi import BackgroundTasks, HTTPException
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging
from typing import Dict, Any, Optional
import jwt
from datetime import datetime, timedelta
import time
import uuid
import base64

from app.config import settings

class EmailService:
    def __init__(self):
        # Add default value when FRONTEND_URL is not set
        self.frontend_url = getattr(settings, 'FRONTEND_URL', 'http://16.171.240.27:8080')
        # Rest of the initialization code remains the same
        # ...

# Rest of the file remains unchanged
