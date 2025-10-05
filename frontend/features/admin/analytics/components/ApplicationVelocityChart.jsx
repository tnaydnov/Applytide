// frontend/features/admin/analytics/components/ApplicationVelocityChart.jsx
export default function ApplicationVelocityChart({ data, loading }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        <p className="mt-2 text-gray-400">Loading application velocity...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No velocity data available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">⚡ Application Velocity Trends</h3>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-900/50 rounded">
          <p className="text-sm text-gray-400">Avg Completion</p>
          <p className="text-2xl font-bold text-white">{data.avg_completion_time?.toFixed(1) || 0}d</p>
        </div>
        <div className="p-4 bg-gray-900/50 rounded">
          <p className="text-sm text-gray-400">Median Time</p>
          <p className="text-2xl font-bold text-white">{data.median_completion_time?.toFixed(1) || 0}d</p>
        </div>
        <div className="p-4 bg-gray-900/50 rounded">
          <p className="text-sm text-gray-400">Active Apps</p>
          <p className="text-2xl font-bold text-white">{data.active_applications || 0}</p>
        </div>
      </div>

      {/* Velocity by Status */}
      {data.velocity_by_status && data.velocity_by_status.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400 font-medium">Average Time by Status</p>
          {data.velocity_by_status.map((item) => (
            <div key={item.status} className="flex items-center justify-between p-3 bg-gray-900/50 rounded">
              <span className="text-white capitalize">{item.status.replace('_', ' ')}</span>
              <div className="text-right">
                <p className="text-white font-semibold">{item.avg_days.toFixed(1)} days</p>
                <p className="text-xs text-gray-500">{item.count} applications</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
