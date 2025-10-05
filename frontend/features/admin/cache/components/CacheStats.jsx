// frontend/features/admin/cache/components/CacheStats.jsx
import StatsCard from '../../shared/components/StatsCard';

export default function CacheStats({ stats, loading, onRefresh }) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No cache statistics available</p>
      </div>
    );
  }

  const hitRate = stats.total_hits + stats.total_misses > 0
    ? ((stats.total_hits / (stats.total_hits + stats.total_misses)) * 100).toFixed(2)
    : 0;

  const memoryUsageMB = (stats.used_memory / (1024 * 1024)).toFixed(2);
  const memoryPeakMB = (stats.used_memory_peak / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">📊 Cache Statistics</h3>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Keys"
          value={stats.total_keys.toLocaleString()}
          icon="🔑"
          color="violet"
        />
        <StatsCard
          title="Hit Rate"
          value={`${hitRate}%`}
          icon="🎯"
          color="green"
        />
        <StatsCard
          title="Memory Used"
          value={`${memoryUsageMB} MB`}
          icon="💾"
          color="blue"
        />
        <StatsCard
          title="Uptime"
          value={`${Math.floor(stats.uptime_seconds / 86400)}d ${Math.floor((stats.uptime_seconds % 86400) / 3600)}h`}
          icon="⏱️"
          color="yellow"
        />
      </div>

      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
        <h4 className="text-md font-semibold text-white mb-4">Detailed Metrics</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Total Hits</p>
            <p className="text-white font-semibold">{stats.total_hits.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400">Total Misses</p>
            <p className="text-white font-semibold">{stats.total_misses.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400">Evicted Keys</p>
            <p className="text-white font-semibold">{stats.evicted_keys.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400">Expired Keys</p>
            <p className="text-white font-semibold">{stats.expired_keys.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400">Peak Memory</p>
            <p className="text-white font-semibold">{memoryPeakMB} MB</p>
          </div>
          <div>
            <p className="text-gray-400">Connected Clients</p>
            <p className="text-white font-semibold">{stats.connected_clients}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
