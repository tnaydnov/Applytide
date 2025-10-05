// frontend/features/admin/analytics/components/CohortRetentionChart.jsx
export default function CohortRetentionChart({ data, loading }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        <p className="mt-2 text-gray-400">Loading cohort retention...</p>
      </div>
    );
  }

  if (!data || data.cohorts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No cohort data available</p>
      </div>
    );
  }

  const getColorForRetention = (rate) => {
    if (rate >= 70) return 'bg-green-500';
    if (rate >= 50) return 'bg-yellow-500';
    if (rate >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">📊 Cohort Retention Analysis</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="p-2 text-left text-gray-400">Cohort</th>
              <th className="p-2 text-center text-gray-400">Size</th>
              {data.periods.map((period, i) => (
                <th key={i} className="p-2 text-center text-gray-400">{period}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.cohorts.map((cohort) => (
              <tr key={cohort.cohort_period} className="hover:bg-gray-700/30">
                <td className="p-2 text-white font-medium">{cohort.cohort_period}</td>
                <td className="p-2 text-center text-gray-300">{cohort.cohort_size}</td>
                {cohort.retention_by_period.map((rate, i) => (
                  <td key={i} className="p-2 text-center">
                    <div className="flex items-center justify-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getColorForRetention(rate)}/20 text-${getColorForRetention(rate).replace('bg-', '')}`}>
                        {rate.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
