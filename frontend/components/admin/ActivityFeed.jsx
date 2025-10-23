import { formatDistanceToNow } from 'date-fns';

/**
 * Activity Feed Component
 */
export default function ActivityFeed({ activities, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse flex gap-4">
              <div className="w-2 h-2 bg-gray-200 rounded-full mt-2"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6 text-center text-gray-500">
          No recent activity
        </div>
      </div>
    );
  }

  const getLevelColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500';
      case 'ERROR':
        return 'bg-red-400';
      case 'WARNING':
        return 'bg-yellow-400';
      default:
        return 'bg-blue-400';
    }
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'user_registered':
        return '👤';
      case 'user_login':
        return '🔑';
      case 'application_created':
        return '📝';
      case 'error':
        return '❌';
      case 'premium_change':
        return '⭐';
      default:
        return '•';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
      </div>
      <div className="p-6">
        <div className="flow-root">
          <ul className="-mb-8">
            {activities.map((activity, idx) => (
              <li key={activity.id}>
                <div className="relative pb-8">
                  {idx !== activities.length - 1 && (
                    <span
                      className="absolute top-5 left-2 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex items-start gap-4">
                    <div>
                      <span className={`
                        h-4 w-4 rounded-full flex items-center justify-center
                        ring-4 ring-white ${getLevelColor(activity.level)}
                      `}>
                        <span className="text-xs">
                          {getEventIcon(activity.event_type)}
                        </span>
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div>
                        <p className="text-sm text-gray-900">
                          {activity.message}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          {activity.user_email && (
                            <span className="font-medium">{activity.user_email}</span>
                          )}
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
