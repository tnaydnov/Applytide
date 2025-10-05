// frontend/features/admin/email/components/TestEmailPanel.jsx
import { useState } from 'react';

export default function TestEmailPanel({ onSend, loading }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('Test Email from Applytide');
  const [body, setBody] = useState('This is a test email sent from the admin panel.');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!to || !subject || !body) {
      alert('Please fill in all fields');
      return;
    }
    onSend(to, subject, body);
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">📧 Send Test Email</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">To Email Address</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="test@example.com"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Email body content..."
            rows={6}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none resize-none"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-violet-500 text-white rounded hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '📤 Sending...' : '📤 Send Test Email'}
        </button>
      </form>
    </div>
  );
}
