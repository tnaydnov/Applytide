/**
 * Stat Card Component for Dashboard
 */
export default function StatCard({ title, value, icon: Icon, change, trend, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-slate-700 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value?.toLocaleString() || 0}</p>
          
          {change !== undefined && (
            <p className={`text-sm mt-2 ${
              trend === 'up' ? 'text-green-400' : 
              trend === 'down' ? 'text-red-400' : 
              'text-slate-400'
            }`}>
              {trend === 'up' && '↑ '}
              {trend === 'down' && '↓ '}
              {change}
            </p>
          )}
        </div>
        
        {Icon && (
          <div className="flex-shrink-0 ml-4">
            <div className="p-3 bg-indigo-600/20 rounded-lg">
              <Icon className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
