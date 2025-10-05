// frontend/features/admin/cache/components/KeyBrowser.jsx
import { useState } from 'react';

export default function KeyBrowser({ 
  keys, 
  loading, 
  onSearch, 
  onSelectKey, 
  onDeleteKey,
  selectedKey 
}) {
  const [searchPattern, setSearchPattern] = useState('*');

  const handleSearch = () => {
    onSearch(searchPattern);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={searchPattern}
            onChange={(e) => setSearchPattern(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search pattern (e.g., user:*, session:*, *)"
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Use * as wildcard. Examples: user:*, *:tokens, session:*:data
          </p>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-violet-500 text-white rounded hover:bg-violet-600 transition-colors disabled:opacity-50"
        >
          {loading ? '🔄' : '🔍'} Search
        </button>
      </div>

      {/* Keys List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
          <p className="text-gray-400 mt-2">Loading keys...</p>
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-xl">🔑 No keys found</p>
          <p className="text-sm mt-2">Try a different search pattern</p>
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 bg-gray-900/50">
            <p className="text-sm text-gray-400">
              Found <span className="text-white font-semibold">{keys.length}</span> keys
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {keys.map((key) => (
              <div
                key={key}
                className={`flex items-center justify-between p-3 border-b border-gray-800 hover:bg-gray-700/30 transition-colors cursor-pointer ${
                  selectedKey === key ? 'bg-violet-900/30' : ''
                }`}
                onClick={() => onSelectKey(key)}
              >
                <span className="text-white font-mono text-sm truncate flex-1">
                  {key}
                </span>
                <div className="flex gap-2 ml-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectKey(key);
                    }}
                    className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                  >
                    👁️ View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteKey(key);
                    }}
                    className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
