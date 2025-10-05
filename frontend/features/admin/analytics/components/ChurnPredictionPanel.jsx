// frontend/features/admin/analytics/components/ChurnPredictionPanel.jsx
export default function ChurnPredictionPanel({ data, loading }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        <p className="mt-2 text-gray-400">Predicting churn...</p>
      </div>
    );
  }

  if (!data || data.at_risk_users.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-xl">✓ No users at risk of churning</p>
        <p className="text-sm mt-2 text-green-400">User engagement looks healthy!</p>
      </div>
    );
  }

  const getRiskColor = (score) => {
    if (score >= 80) return 'red';
    if (score >= 60) return 'orange';
    if (score >= 40) return 'yellow';
    return 'green';
  };

  const getRiskLabel = (score) => {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">⚠️ Churn Risk Prediction</h3>
      
      <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
        <p className="text-yellow-400 font-medium">
          {data.at_risk_users.length} user{data.at_risk_users.length !== 1 ? 's' : ''} at risk of churning
        </p>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {data.at_risk_users.map((user) => {
          const riskColor = getRiskColor(user.churn_score);
          const riskLabel = getRiskLabel(user.churn_score);
          
          return (
            <div key={user.user_id} className="p-4 bg-gray-900/50 rounded border border-gray-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white font-medium">{user.email}</p>
                  <p className="text-sm text-gray-400">ID: {user.user_id}</p>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-semibold bg-${riskColor}-500/20 text-${riskColor}-400`}>
                  {riskLabel} Risk ({user.churn_score.toFixed(1)})
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-xs mt-3">
                <div>
                  <p className="text-gray-500">Last Active</p>
                  <p className="text-white">{user.days_since_last_active}d ago</p>
                </div>
                <div>
                  <p className="text-gray-500">Applications</p>
                  <p className="text-white">{user.total_applications}</p>
                </div>
                <div>
                  <p className="text-gray-500">Avg Time</p>
                  <p className="text-white">{user.avg_time_per_application?.toFixed(1) || 0}h</p>
                </div>
              </div>

              {user.risk_factors && user.risk_factors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">Risk Factors:</p>
                  <ul className="text-xs text-red-400 space-y-1">
                    {user.risk_factors.map((factor, i) => (
                      <li key={i}>• {factor}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
