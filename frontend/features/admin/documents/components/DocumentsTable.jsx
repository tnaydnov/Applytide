// frontend/features/admin/documents/components/DocumentsTable.jsx
import { useState } from 'react';
import { formatFileSize, getDocumentTypeConfig, exportToCSV } from '../utils/helpers';

export default function DocumentsTable({ 
  documents, 
  loading, 
  onDelete,
  selected,
  onSelect,
  onSelectAll 
}) {
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedDocuments = [...documents].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (sortField === 'file_size') {
      aVal = aVal || 0;
      bVal = bVal || 0;
    }
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-400">⇅</span>;
    return <span className="text-violet-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        <p className="mt-2 text-gray-400">Loading documents...</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-xl">📄 No documents found</p>
        <p className="text-sm mt-2">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-800/50 border-b border-gray-700">
          <tr>
            <th className="p-3 text-left">
              <input
                type="checkbox"
                checked={selected.length === documents.length}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="rounded border-gray-600 text-violet-500 focus:ring-violet-500"
              />
            </th>
            <th className="p-3 text-left text-gray-300 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('id')}>
              ID <SortIcon field="id" />
            </th>
            <th className="p-3 text-left text-gray-300 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('user_email')}>
              User <SortIcon field="user_email" />
            </th>
            <th className="p-3 text-left text-gray-300 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('document_type')}>
              Type <SortIcon field="document_type" />
            </th>
            <th className="p-3 text-left text-gray-300 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('file_name')}>
              File Name <SortIcon field="file_name" />
            </th>
            <th className="p-3 text-left text-gray-300 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('file_size')}>
              Size <SortIcon field="file_size" />
            </th>
            <th className="p-3 text-left text-gray-300 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('created_at')}>
              Uploaded <SortIcon field="created_at" />
            </th>
            <th className="p-3 text-left text-gray-300 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {sortedDocuments.map((doc) => {
            const typeConfig = getDocumentTypeConfig(doc.document_type);
            const isSelected = selected.includes(doc.id);
            
            return (
              <tr 
                key={doc.id} 
                className={`hover:bg-gray-800/30 ${isSelected ? 'bg-violet-900/20' : ''}`}
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelect(doc.id, e.target.checked)}
                    className="rounded border-gray-600 text-violet-500 focus:ring-violet-500"
                  />
                </td>
                <td className="p-3 text-gray-400 font-mono text-sm">{doc.id}</td>
                <td className="p-3">
                  <div className="text-white">{doc.user_email || 'Unknown'}</div>
                  {doc.user_name && <div className="text-sm text-gray-400">{doc.user_name}</div>}
                </td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-${typeConfig.color}-500/20 text-${typeConfig.color}-400`}>
                    {typeConfig.icon} {typeConfig.label}
                  </span>
                </td>
                <td className="p-3">
                  <div className="text-white truncate max-w-xs" title={doc.file_name}>
                    {doc.file_name || 'unknown.file'}
                  </div>
                  {doc.file_path && (
                    <div className="text-xs text-gray-500 truncate max-w-xs" title={doc.file_path}>
                      {doc.file_path}
                    </div>
                  )}
                </td>
                <td className="p-3 text-gray-300 font-mono text-sm">
                  {formatFileSize(doc.file_size)}
                </td>
                <td className="p-3 text-gray-400 text-sm">
                  {new Date(doc.created_at).toLocaleString()}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => onDelete(doc)}
                    className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
