import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  FiHome, 
  FiUsers, 
  FiAlertCircle, 
  FiActivity, 
  FiDatabase,
  FiMenu,
  FiX,
  FiCpu,
  FiShield
} from 'react-icons/fi';
import { useState } from 'react';

/**
 * Admin Layout with sidebar navigation
 */
export default function AdminLayout({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { 
      label: 'Dashboard', 
      href: '/admin', 
      icon: FiHome,
      exact: true
    },
    { 
      label: 'Users', 
      href: '/admin/users', 
      icon: FiUsers 
    },
    { 
      label: 'Error Logs', 
      href: '/admin/errors', 
      icon: FiAlertCircle 
    },
    { 
      label: 'Active Sessions', 
      href: '/admin/sessions', 
      icon: FiActivity 
    },
    { 
      label: 'LLM Usage', 
      href: '/admin/llm-usage', 
      icon: FiCpu 
    },
    { 
      label: 'Security', 
      href: '/admin/security', 
      icon: FiShield 
    },
    { 
      label: 'System Health', 
      href: '/admin/system', 
      icon: FiDatabase 
    }
  ];

  const isActive = (item) => {
    if (item.exact) {
      return router.pathname === item.href;
    }
    return router.pathname.startsWith(item.href);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-slate-800 border-r border-slate-700
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-200"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-colors duration-200
                  ${active 
                    ? 'bg-indigo-600 text-white font-medium' 
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Back to App Link */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <span>←</span>
            <span>Back to App</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-slate-800 border-b border-slate-700 h-16 flex items-center px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-slate-200"
          >
            <FiMenu size={24} />
          </button>
          <h1 className="ml-4 text-lg font-semibold text-white">Admin Panel</h1>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
