// frontend/features/admin/components/SystemHealthCard.jsx
export default function SystemHealthCard({ health }) {
  if (!health) return null;

  const formatCurrency = (value) => `$${value.toFixed(2)}`;
  const formatBytes = (mb) => mb >= 1024 ? `${(mb/1024).toFixed(2)} GB` : `${mb.toFixed(2)} MB`;

  return (
    <div className="glass-card p-6 space-y-6">
      <h3 className="text-lg font-semibold text-slate-100">System Health</h3>

      {/* LLM Usage */}
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-3">LLM Usage & Costs</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-400">24h Calls</div>
            <div className="text-xl font-semibold text-slate-100">{health.llm_calls_24h.toLocaleString()}</div>
            <div className="text-xs text-slate-400 mt-1">Cost: {formatCurrency(health.llm_cost_24h)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">7d Calls</div>
            <div className="text-xl font-semibold text-slate-100">{health.llm_calls_7d.toLocaleString()}</div>
            <div className="text-xs text-slate-400 mt-1">Cost: {formatCurrency(health.llm_cost_7d)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">30d Cost</div>
            <div className="text-xl font-semibold text-amber-300">{formatCurrency(health.llm_cost_30d)}</div>
          </div>
        </div>
      </div>

      <div className="soft-divider" />

      {/* Cache Performance */}
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-3">Cache Performance (24h)</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-slate-400">Hit Rate</div>
            <div className="text-xl font-semibold text-green-300">{(health.cache_hit_rate * 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Hits</div>
            <div className="text-xl font-semibold text-slate-100">{health.cache_hits_24h.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Misses</div>
            <div className="text-xl font-semibold text-slate-100">{health.cache_misses_24h.toLocaleString()}</div>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          Cache Size: {formatBytes(health.cache_size_mb)}
        </div>
      </div>

      <div className="soft-divider" />

      {/* Database */}
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-3">Database</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">DB Size</span>
            <span className="text-sm font-medium text-slate-100">{formatBytes(health.db_size_mb)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">Connection Pool</span>
            <span className="text-sm font-medium text-slate-100">
              {health.db_connection_pool_available}/{health.db_connection_pool_size} available
            </span>
          </div>
        </div>
      </div>

      <div className="soft-divider" />

      {/* API Health */}
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-3">API Health (24h)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-400">Total Calls</div>
            <div className="text-xl font-semibold text-slate-100">{health.total_api_calls_24h.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Avg Response</div>
            <div className="text-xl font-semibold text-slate-100">{health.avg_response_time_ms.toFixed(0)}ms</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Errors</div>
            <div className={`text-xl font-semibold ${health.error_count_24h > 0 ? 'text-red-300' : 'text-green-300'}`}>
              {health.error_count_24h}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Error Rate</div>
            <div className={`text-xl font-semibold ${health.error_rate > 0.01 ? 'text-red-300' : 'text-green-300'}`}>
              {(health.error_rate * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
