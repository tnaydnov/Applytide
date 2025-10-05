// frontend/features/admin/applications/components/ApplicationsTable.jsx
import { useState } from 'react';
import { getStatusStyle } from '../utils/helpers';

export default function ApplicationsTable({ 
  applications, 
  selectedIds, 
  onSelectIds, 
  onViewDetails,
  onUpdateStatus,
  onDelete 
}) {
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const toggleSelectAll = () => {
    if (selectedIds.length === applications.length) {
      onSelectIds([]);
    } else {
      onSelectIds(applications.map(app => app.id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      onSelectIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onSelectIds([...selectedIds, id]);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  if (applications.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-slate-100">No applications found</h3>
        <p className="mt-1 text-sm text-slate-400">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/5">
            <tr>
              <th scope="col" className="relative w-12 px-6 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.length === applications.length && applications.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-white/10 bg-white/5 text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                />
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:text-slate-100"
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center gap-1">
                  ID
                  {sortBy === 'id' && (
                    <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Job
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:text-slate-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  {sortBy === 'status' && (
                    <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:text-slate-100"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  Created
                  {sortBy === 'created_at' && (
                    <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Documents
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {applications.map((app) => {
              const statusStyle = getStatusStyle(app.status);
              const isSelected = selectedIds.includes(app.id);
              
              return (
                <tr 
                  key={app.id} 
                  className={`${isSelected ? 'bg-violet-500/10' : 'hover:bg-white/5'} transition-colors`}
                >
                  <td className="relative w-12 px-6 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(app.id)}
                      className="h-4 w-4 rounded border-white/10 bg-white/5 text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">
                    #{app.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="text-slate-100">{app.user_email || 'N/A'}</div>
                      {app.user_name && (
                        <div className="text-slate-400">{app.user_name}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm max-w-xs">
                      <div className="text-slate-100 font-medium truncate">{app.job_title || 'N/A'}</div>
                      <div className="text-slate-400 truncate">{app.company_name || 'Unknown Company'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bgColor} ${statusStyle.textColor}`}>
                      {statusStyle.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {app.document_count > 0 ? (
                      <span className="text-violet-400">{app.document_count} docs</span>
                    ) : (
                      <span className="text-slate-500">No docs</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => onViewDetails(app.id)}
                      className="text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onUpdateStatus(app)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(app.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
