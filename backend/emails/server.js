const express = require('express');
const { render } = require('@react-email/render');
const React = require('react');
const path = require('path');
const fs = require('fs');

const app = express();

// ── Security: reasonable body size limit ────────────────────────────
app.use(express.json({ limit: '256kb' }));

// ── Internal API key check (skip in development) ───────────────────
const INTERNAL_KEY = process.env.EMAIL_SERVICE_KEY || '';
const IS_PROD = process.env.NODE_ENV === 'production';

function requireInternalKey(req, res, next) {
  if (!IS_PROD) return next();
  const provided = req.headers['x-internal-key'] || '';
  if (!INTERNAL_KEY || provided !== INTERNAL_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// ── Template helpers ────────────────────────────────────────────────
const TEMPLATES_DIR = path.resolve(__dirname, 'templates');
const TEMPLATE_NAME_RE = /^[a-zA-Z0-9_-]+$/;

function resolveTemplate(name) {
  if (!name || !TEMPLATE_NAME_RE.test(name)) {
    return { error: 'Invalid template name — alphanumeric, hyphens, and underscores only' };
  }
  const resolved = path.resolve(TEMPLATES_DIR, `${name}.jsx`);
  // Prevent path traversal
  if (!resolved.startsWith(TEMPLATES_DIR + path.sep)) {
    return { error: 'Invalid template path' };
  }
  if (!fs.existsSync(resolved)) {
    return { error: `Template '${name}' not found` };
  }
  return { path: resolved };
}

// ── Health check ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'email-renderer' });
});

// ── Render email ────────────────────────────────────────────────────
app.post('/render', requireInternalKey, async (req, res) => {
  try {
    const { template, data } = req.body;

    const result = resolveTemplate(template);
    if (result.error) {
      const status = result.error.includes('not found') ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }

    // Clear require cache in development so template changes are picked up
    if (!IS_PROD) {
      delete require.cache[require.resolve(result.path)];
    }

    const EmailComponent = require(result.path).default;
    if (!EmailComponent) {
      return res.status(404).json({ error: `Template '${template}' has no default export` });
    }

    const html = await render(React.createElement(EmailComponent, data || {}));

    res.json({
      html,
      template,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Email rendering error:', error);
    res.status(500).json({
      error: 'Failed to render email',
      ...(IS_PROD ? {} : { message: error.message, stack: error.stack }),
    });
  }
});

// ── List available templates ────────────────────────────────────────
app.get('/templates', requireInternalKey, (_req, res) => {
  try {
    const files = fs.readdirSync(TEMPLATES_DIR)
      .filter(f => f.endsWith('.jsx'))
      .map(f => f.replace('.jsx', ''));

    res.json({ templates: files });
  } catch (error) {
    console.error('Template listing error:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Email rendering service running on port ${PORT}`);
});
