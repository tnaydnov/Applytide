// frontend/features/admin/components/UsersTable.jsx
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function UsersTable({ users, onUserClick, onUpdateStatus }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Activity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {users.map((user) => (
              <tr 
                key={user.id} 
                className="hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => onUserClick(user)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-sm font-semibold">
                      {(user.full_name || user.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-100">
                        {user.full_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.is_admin && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/30">
                        Admin
                      </span>
                    )}
                    {user.is_premium && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30">
                        Premium
                      </span>
                    )}
                    {user.is_oauth_user && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30">
                        OAuth
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-slate-300">
                    <div>{user.total_applications} apps</div>
                    <div className="text-xs text-slate-400">
                      {user.total_documents} docs · {user.total_jobs} jobs
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-slate-300">
                    {user.last_login_at 
                      ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })
                      : 'Never'
                    }
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-slate-300">
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUserClick(user);
                    }}
                    className="text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
