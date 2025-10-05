// frontend/features/admin/analytics/components/FeatureAdoptionChart.jsx
export default function FeatureAdoptionChart({ data, loading }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        <p className="mt-2 text-gray-400">Loading feature adoption...</p>
      </div>
    );
  }

  if (!data || data.features.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No feature adoption data available</p>
      </div>
    );
  }

  const maxUsers = Math.max(...data.features.map(f => f.unique_users));

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">📈 Feature Adoption Rates</h3>
      
      <div className="space-y-4">
        {data.features.map((feature) => {
          const adoptionRate = (feature.unique_users / data.total_users) * 100;
          const widthPercent = (feature.unique_users / maxUsers) * 100;
          
          return (
            <div key={feature.feature_name} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white font-medium">{feature.feature_name}</span>
                <span className="text-gray-400">
                  {feature.unique_users} / {data.total_users} users ({adoptionRate.toFixed(1)}%)
                </span>
              </div>
              
              <div className="relative w-full bg-gray-700 rounded-full h-3">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>First use: {new Date(feature.first_use).toLocaleDateString()}</span>
                <span>Last use: {new Date(feature.last_use).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
