// frontend/features/admin/gdpr/components/DeletionPanel.jsx
import { useState } from 'react';

export default function DeletionPanel({ onDelete, loading }) {
  const [userId, setUserId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userId) {
      alert('Please enter a user ID');
      return;
    }
    onDelete(userId);
  };

  return (
    <div className="bg-red-900/10 border border-red-500/30 rounded-lg p-6">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">⚠️</span>
        <div>
          <h3 className="text-lg font-semibold text-red-400">🗑️ Delete User Data</h3>
          <p className="text-sm text-red-300/70 mt-2">
            <strong>PERMANENT DELETION:</strong> This will permanently delete ALL user data including profile, applications, documents, and activity logs. This action cannot be undone and is irreversible.
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">User ID</label>
          <input
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID"
            className="w-full px-3 py-2 bg-gray-900 border border-red-700 rounded text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {loading ? '🗑️ Deleting...' : '🗑️ Delete All Data'}
        </button>
      </form>
    </div>
  );
}
