import formidable from 'formidable';
import fs from 'fs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the multipart form data
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB max
      keepExtensions: true,
      uploadDir: '/tmp',
    });

    const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000';

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, flds, fls) => (err ? reject(err) : resolve({ fields: flds, files: fls })));
    });

    // Extract form fields (formidable returns arrays for field values)
    const name = Array.isArray(fields.name) ? fields.name[0] : fields.name || '';
    const email = Array.isArray(fields.email) ? fields.email[0] : fields.email || '';
    const type = Array.isArray(fields.type) ? fields.type[0] : fields.type;
    const message = Array.isArray(fields.message) ? fields.message[0] : fields.message;

    // Validate required fields
    if (!type || !message) {
      return res.status(400).json({ error: 'Type and message are required' });
    }

    // Prepare form data for backend
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('type', type);
    formData.append('message', message);

    // Handle file upload if present
    if (files.screenshot) {
      const file = Array.isArray(files.screenshot) ? files.screenshot[0] : files.screenshot;
      if (file && file.filepath) {
        try {
          // Read the file and create a Blob
          const fileBuffer = fs.readFileSync(file.filepath);
          const blob = new Blob([fileBuffer], { type: file.mimetype || 'image/png' });
          formData.append('screenshot', blob, file.originalFilename || 'screenshot.png');

          // Clean up temporary file
          fs.unlinkSync(file.filepath);
        } catch (fileError) {
          console.error('Error handling file upload:', fileError);
          // Continue without the file
        }
      }
    }

    // Forward the request to the backend (forward cookies if present)
    const headers = {};
    if (req.headers?.cookie) headers['cookie'] = req.headers.cookie;
    const response = await fetch(`${BACKEND_URL}/feedback`, {
      method: 'POST',
      body: formData,
      headers
    });

    if (response.ok) {
      const data = await response.json();
      res.status(200).json(data);
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      res.status(response.status).json(errorData);
    }
  } catch (error) {
    console.error('Feedback API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Configure Next.js to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};
