const express = require('express');
const { render } = require('@react-email/render');
const React = require('react');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'email-renderer' });
});

// Render email endpoint
app.post('/render', async (req, res) => {
  try {
    const { template, data } = req.body;

    if (!template) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    // Dynamically import the email component
    const EmailComponent = require(`./templates/${template}.jsx`).default;

    if (!EmailComponent) {
      return res.status(404).json({ error: `Template '${template}' not found` });
    }

    // Render to HTML (await the Promise)
    const html = await render(React.createElement(EmailComponent, data || {}));

    res.json({ 
      html,
      template,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Email rendering error:', error);
    res.status(500).json({ 
      error: 'Failed to render email',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// List available templates
app.get('/templates', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const templatesDir = path.join(__dirname, 'templates');
    const files = fs.readdirSync(templatesDir)
      .filter(f => f.endsWith('.jsx'))
      .map(f => f.replace('.jsx', ''));
    
    res.json({ templates: files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`📧 Email rendering service running on port ${PORT}`);
});
