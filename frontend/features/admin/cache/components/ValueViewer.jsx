// frontend/features/admin/cache/components/ValueViewer.jsx
import { useState, useEffect } from 'react';

export default function ValueViewer({ cacheKey, value, loading, onLoad }) {
  const [formattedValue, setFormattedValue] = useState('');
  const [valueType, setValueType] = useState('string');

  useEffect(() => {
    if (!value) return;

    // Determine value type and format
    if (value.value === null || value.value === undefined) {
      setValueType('null');
      setFormattedValue('null');
    } else if (typeof value.value === 'object') {
      setValueType('json');
      setFormattedValue(JSON.stringify(value.value, null, 2));
    } else if (typeof value.value === 'string') {
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(value.value);
        setValueType('json');
        setFormattedValue(JSON.stringify(parsed, null, 2));
      } catch {
        setValueType('string');
        setFormattedValue(value.value);
      }
    } else {
      setValueType('primitive');
      setFormattedValue(String(value.value));
    }
  }, [value]);

  useEffect(() => {
    if (cacheKey) {
      onLoad();
    }
  }, [cacheKey, onLoad]);

  if (!cacheKey) {
    return (
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-12 text-center">
        <p className="text-gray-400 text-lg">👈 Select a key to view its value</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        <p className="text-gray-400 mt-3">Loading value...</p>
      </div>
    );
  }

  if (!value) {
    return (
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-12 text-center">
        <p className="text-red-400 text-lg">❌ Key not found or expired</p>
      </div>
    );
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formattedValue);
    alert('Copied to clipboard!');
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-900/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">🔍 Cache Value</h3>
          <button
            onClick={copyToClipboard}
            className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            📋 Copy
          </button>
        </div>
        <p className="text-sm text-gray-400 font-mono break-all">{cacheKey}</p>
      </div>

      {/* Metadata */}
      <div className="p-4 border-b border-gray-700 bg-gray-900/30">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Type</p>
            <p className="text-white font-semibold">{value.type || 'unknown'}</p>
          </div>
          <div>
            <p className="text-gray-400">TTL</p>
            <p className="text-white font-semibold">
              {value.ttl === -1 ? 'Never' : value.ttl === -2 ? 'Expired' : `${value.ttl}s`}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Size</p>
            <p className="text-white font-semibold">{value.size || 0} bytes</p>
          </div>
        </div>
      </div>

      {/* Value */}
      <div className="p-4 max-h-96 overflow-auto">
        {valueType === 'json' ? (
          <pre className="text-sm text-gray-300 font-mono bg-gray-900 p-4 rounded overflow-x-auto">
            {formattedValue}
          </pre>
        ) : (
          <div className="text-sm text-gray-300 font-mono bg-gray-900 p-4 rounded whitespace-pre-wrap break-all">
            {formattedValue}
          </div>
        )}
      </div>
    </div>
  );
}
