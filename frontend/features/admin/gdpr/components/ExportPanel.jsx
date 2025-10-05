// frontend/features/admin/gdpr/components/ExportPanel.jsx
import { useState } from 'react';

export default function ExportPanel({ onExport, loading }) {
  const [userId, setUserId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userId) {
      alert('Please enter a user ID');
      return;
    }
    onExport(userId);
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">📥 Export User Data</h3>
      <p className="text-sm text-gray-400 mb-4">
        Export all data associated with a user account. This includes profile, applications, documents, and activity logs.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">User ID</label>
          <input
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {loading ? '📦 Exporting...' : '📥 Export Data'}
        </button>
      </form>
    </div>
  );
}
