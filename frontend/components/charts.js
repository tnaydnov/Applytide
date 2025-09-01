// Chart components for analytics dashboard
// These are placeholder components that can be enhanced with actual charting libraries

export function BarChart({ data, height = 400, className = "" }) {
  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <div className="flex items-end justify-center h-full space-x-2 p-4">
        {data?.map((item, index) => (
          <div key={index} className="flex flex-col items-center">
            <div 
              className="bg-blue-500 rounded-t min-w-8"
              style={{ 
                height: `${(item.value / Math.max(...data.map(d => d.value))) * (height - 60)}px`,
                width: '30px'
              }}
            ></div>
            <span className="text-xs mt-2 text-gray-600">{item.label}</span>
            <span className="text-xs text-gray-500">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({ data, height = 400, className = "" }) {
  return (
    <div className={`w-full bg-gray-50 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
      <div className="text-center text-gray-500">
        <div className="text-4xl mb-2">📈</div>
        <div>Line Chart</div>
        <div className="text-sm">{data?.length || 0} data points</div>
      </div>
    </div>
  );
}

export function PieChart({ data, height = 400, className = "" }) {
  return (
    <div className={`w-full bg-gray-50 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
      <div className="text-center text-gray-500">
        <div className="text-4xl mb-2">🥧</div>
        <div>Pie Chart</div>
        <div className="text-sm">{data?.length || 0} segments</div>
      </div>
    </div>
  );
}

export function DonutChart({ data, height = 400, className = "" }) {
  if (!data || data.length === 0) {
    return (
      <div className={`w-full bg-gray-50 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🍩</div>
          <div>No data available</div>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <div className="flex items-center justify-center h-full">
        <div className="relative">
          {/* Simple donut representation */}
          <div className="w-48 h-48 rounded-full border-8 border-gray-200 relative">
            {data.map((item, index) => (
              <div
                key={index}
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(${colors[index % colors.length]} 0deg ${(item.value / total) * 360}deg, transparent ${(item.value / total) * 360}deg)`,
                  transform: `rotate(${data.slice(0, index).reduce((sum, prev) => sum + (prev.value / total) * 360, 0)}deg)`
                }}
              />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
          </div>
        </div>
        <div className="ml-8 space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center">
              <div 
                className="w-4 h-4 rounded mr-2"
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <span className="text-sm text-gray-700">{item.label}</span>
              <span className="text-sm text-gray-500 ml-auto">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AreaChart({ data, height = 400, className = "" }) {
  return (
    <div className={`w-full bg-gray-50 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
      <div className="text-center text-gray-500">
        <div className="text-4xl mb-2">📊</div>
        <div>Area Chart</div>
        <div className="text-sm">{data?.length || 0} data points</div>
      </div>
    </div>
  );
}

// Export all charts as default
export default {
  BarChart,
  LineChart,
  PieChart,
  DonutChart,
  AreaChart
};
