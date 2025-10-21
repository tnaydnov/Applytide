// frontend/pages/admin/llm-usage.js
import { useState, useEffect } from 'react';
import AdminGuard from '../../components/guards/AdminGuard';
import PageContainer from '../../components/layout/PageContainer';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, Select, Badge } from '../../components/ui';
import { 
  getLLMStats, 
  getLLMUsageByUser, 
  getLLMUsageByModel,
  getRecentLLMCalls,
  getLLMCosts,
  getLLMTrends
} from '../../services/admin';
import { formatDistanceToNow } from 'date-fns';

export default function LLMUsagePage() {
  const [timeRange, setTimeRange] = useState('24');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [byUser, setByUser] = useState([]);
  const [byModel, setByModel] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [costs, setCosts] = useState(null);
  const [trends, setTrends] = useState([]);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const hours = parseInt(timeRange);
      const days = Math.max(1, Math.floor(hours / 24));
      
      const [statsData, userData, modelData, callsData, costsData, trendsData] = await Promise.all([
        getLLMStats(hours),
        getLLMUsageByUser(10, hours),
        getLLMUsageByModel(hours),
        getRecentLLMCalls(20),
        getLLMCosts(hours),
        getLLMTrends(days)
      ]);

      setStats(statsData);
      setByUser(userData);
      setByModel(modelData);
      setRecentCalls(callsData);
      setCosts(costsData);
      setTrends(trendsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const formatCost = (cents) => {
    return `$${(cents / 100).toFixed(4)}`;
  };

  const formatNumber = (num) => {
    return num?.toLocaleString() || '0';
  };

  if (loading) {
    return (
      <AdminGuard>
        <PageContainer>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        </PageContainer>
      </AdminGuard>
    );
  }

  if (error) {
    return (
      <AdminGuard>
        <PageContainer>
          <div className="glass-card p-6 text-center text-red-300">
            Error: {error}
          </div>
        </PageContainer>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <PageContainer>
        <PageHeader
          title="🤖 LLM Usage Monitoring"
          subtitle="Track OpenAI API costs and usage"
          actions={
            <div className="flex items-center gap-4">
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-32"
              >
                <option value="1">Last Hour</option>
                <option value="24">Last 24h</option>
                <option value="168">Last 7d</option>
                <option value="720">Last 30d</option>
              </Select>
              <Button onClick={loadData} variant="outline">
                Refresh
              </Button>
            </div>
          }
        />

        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card glass-violet p-6">
              <div className="text-sm font-medium text-slate-300 mb-1">Total API Calls</div>
              <div className="text-3xl font-bold text-slate-100 mb-2">
                {formatNumber(stats?.total_calls)}
              </div>
              <div className="text-xs text-slate-400">
                {formatNumber(stats?.successful_calls)} successful, {formatNumber(stats?.failed_calls)} errors
              </div>
            </div>

            <div className="glass-card glass-cyan p-6">
              <div className="text-sm font-medium text-slate-300 mb-1">Total Cost</div>
              <div className="text-3xl font-bold text-slate-100 mb-2">
                {formatCost(stats?.total_cost_cents || 0)}
              </div>
              <div className="text-xs text-slate-400">
                Avg: {formatCost(stats?.avg_cost_cents || 0)} per call
              </div>
            </div>

            <div className="glass-card glass-amber p-6">
              <div className="text-sm font-medium text-slate-300 mb-1">Total Tokens</div>
              <div className="text-3xl font-bold text-slate-100 mb-2">
                {formatNumber(stats?.total_tokens)}
              </div>
              <div className="text-xs text-slate-400">
                {formatNumber(stats?.prompt_tokens)} prompt + {formatNumber(stats?.completion_tokens)} completion
              </div>
            </div>

            <div className="glass-card glass-rose p-6">
              <div className="text-sm font-medium text-slate-300 mb-1">Error Rate</div>
              <div className="text-3xl font-bold text-slate-100 mb-2">
                {stats?.total_calls > 0 
                  ? ((stats.failed_calls / stats.total_calls) * 100).toFixed(1)
                  : '0.0'
                }%
              </div>
              <div className="text-xs text-slate-400">
                {formatNumber(stats?.failed_calls)} failed calls
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          {costs && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">💰 Cost Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* By Provider */}
                <div>
                  <div className="text-sm font-medium text-slate-300 mb-3">By Provider</div>
                  {costs.by_provider?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-slate-300">{item.provider}</span>
                      <div className="text-right">
                        <div className="text-slate-100 font-medium">{formatCost(item.cost_cents)}</div>
                        <div className="text-xs text-slate-400">{item.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* By Model */}
                <div>
                  <div className="text-sm font-medium text-slate-300 mb-3">By Model</div>
                  {costs.by_model?.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-slate-300 text-sm">{item.model}</span>
                      <div className="text-right">
                        <div className="text-slate-100 font-medium">{formatCost(item.cost_cents)}</div>
                        <div className="text-xs text-slate-400">{item.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* By Purpose */}
                <div>
                  <div className="text-sm font-medium text-slate-300 mb-3">By Purpose</div>
                  {costs.by_purpose?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-slate-300">{item.purpose}</span>
                      <div className="text-right">
                        <div className="text-slate-100 font-medium">{formatCost(item.cost_cents)}</div>
                        <div className="text-xs text-slate-400">{item.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Users by Cost */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">👥 Top Users by Cost</h3>
              <div className="space-y-3">
                {byUser?.map((user, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10">
                    <div>
                      <div className="font-medium text-slate-100">
                        {user.email || 'Unknown User'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatNumber(user.total_calls)} calls • {formatNumber(user.total_tokens)} tokens
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-100">{formatCost(user.total_cost_cents)}</div>
                      <div className="text-xs text-slate-400">
                        Avg: {formatCost(user.avg_cost_cents)}
                      </div>
                    </div>
                  </div>
                ))}
                {(!byUser || byUser.length === 0) && (
                  <div className="text-center text-slate-400 py-8">No usage data available</div>
                )}
              </div>
            </div>

            {/* Usage by Model */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">🎯 Usage by Model</h3>
              <div className="space-y-3">
                {byModel?.map((model, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-slate-100">{model.model}</div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-100">{formatCost(model.total_cost_cents)}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-slate-400">Calls</div>
                        <div className="text-slate-200 font-medium">{formatNumber(model.total_calls)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Tokens</div>
                        <div className="text-slate-200 font-medium">{formatNumber(model.total_tokens)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Avg Cost</div>
                        <div className="text-slate-200 font-medium">{formatCost(model.avg_cost_cents)}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {(!byModel || byModel.length === 0) && (
                  <div className="text-center text-slate-400 py-8">No model data available</div>
                )}
              </div>
            </div>
          </div>

          {/* Recent API Calls */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">📋 Recent API Calls</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Time</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">User</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Model</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Purpose</th>
                    <th className="text-right text-xs font-medium text-slate-400 pb-3">Tokens</th>
                    <th className="text-right text-xs font-medium text-slate-400 pb-3">Cost</th>
                    <th className="text-right text-xs font-medium text-slate-400 pb-3">Latency</th>
                    <th className="text-center text-xs font-medium text-slate-400 pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCalls?.map((call, idx) => (
                    <tr key={idx} className="border-b border-white/5">
                      <td className="py-3 text-xs text-slate-300">
                        {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                      </td>
                      <td className="py-3 text-xs text-slate-300">{call.user_email || 'Unknown'}</td>
                      <td className="py-3 text-xs text-slate-300 font-mono">{call.model}</td>
                      <td className="py-3 text-xs text-slate-300">{call.purpose || 'N/A'}</td>
                      <td className="py-3 text-xs text-slate-300 text-right">{formatNumber(call.total_tokens)}</td>
                      <td className="py-3 text-xs text-slate-300 text-right font-medium">{formatCost(call.cost_cents)}</td>
                      <td className="py-3 text-xs text-slate-300 text-right">{call.latency_ms}ms</td>
                      <td className="py-3 text-center">
                        {call.error_message ? (
                          <Badge variant="danger" size="sm">Error</Badge>
                        ) : (
                          <Badge variant="success" size="sm">Success</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!recentCalls || recentCalls.length === 0) && (
                <div className="text-center text-slate-400 py-8">No recent calls</div>
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </AdminGuard>
  );
}
