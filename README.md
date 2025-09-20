# Applytide - Job Application Management Platform

A comprehensive job application tracking system with AI-powered features, built with FastAPI (backend), Next.js (frontend), and Chrome extension integration.

## Quick Start (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/applytide.git
   cd applytide
   ```

2. **Set up environment**
   ```bash
   # Copy environment file (Windows: copy manually)
   cp .env.example .env
   ```

3. **Start development environment**
   ```bash
   docker compose up --build
   ```

4. **Access the application**
   - Web Interface: http://localhost:3000
   - API Documentation: http://localhost:8000/docs
   - API Health Check: http://localhost:8000/health
   - Email Testing (MailDev): http://localhost:1080

## Features

- **Job Application Tracking**: Complete pipeline management from application to offer
- **AI-Powered Job Extraction**: Chrome extension automatically extracts job details
- **Smart Resume Optimization**: AI suggestions for resume improvements
- **Google Calendar Integration**: Automatic interview scheduling
- **Analytics Dashboard**: Track application success rates and metrics
- **Document Management**: Store and organize resumes, cover letters, and references
- **Real-time Notifications**: WebSocket-powered updates and reminders

## Architecture

- **Backend**: FastAPI with PostgreSQL and Redis
- **Frontend**: Next.js with Tailwind CSS
- **Chrome Extension**: Automated job data extraction
- **Infrastructure**: Docker containers with Nginx reverse proxy
- **AI Integration**: OpenAI GPT for job analysis and resume optimization

## Production Deployment

For production deployment, see [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for detailed instructions including:
- Environment configuration
- SSL certificate setup
- Security considerations
- Monitoring and maintenance

## Development

### Project Structure
```
├── backend/           # FastAPI application
├── frontend/          # Next.js web application
├── chrome-extension/  # Browser extension
├── nginx/            # Reverse proxy configuration
└── monitoring/       # Monitoring and logging setup
```

### Tech Stack
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, Redis, Celery
- **Frontend**: Next.js, React, Tailwind CSS, WebSocket
- **Extension**: Chrome Extension Manifest V3
- **Infrastructure**: Docker, Nginx, Let's Encrypt
- **AI**: OpenAI GPT-4, Custom AI workflows

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is proprietary. All rights reserved.lot

Dockerized FastAPI (API) + Next.js (web) starter.

## Run locally
1. Copy env: `cp .env.example .env` (Windows: copy the file manually)
2. Start: `docker compose up --build`
3. Open web: http://localhost:3000  |  API: http://localhost:8000/health

## What’s next
- Add Postgres models (users, applications…)
- Auth (JWT)
- Kanban board
- Resume/JD scoring worker
