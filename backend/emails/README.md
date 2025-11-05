# Email Service

This is the React Email rendering service for Applytide.

## Architecture

```
Python Backend → HTTP Request (Port 3001) → Email Service (Node.js) → React Email → HTML
```

## Development

```bash
npm install
npm run dev
```

## API Endpoints

- `GET /health` - Health check
- `GET /templates` - List available templates  
- `POST /render` - Render a template

### Render Example

```bash
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d '{
    "template": "ReminderEmail",
    "data": {
      "name": "Alex",
      "title": "Technical Interview",
      "dueDate": "Tomorrow at 2PM",
      "timeUntil": "18 hours",
      "urgency": "tomorrow",
      "eventType": "interview",
      "actionUrl": "https://applytide.com"
    }
  }'
```

## Docker

Built and deployed as part of docker-compose:

```bash
docker-compose up --build email_service
```
