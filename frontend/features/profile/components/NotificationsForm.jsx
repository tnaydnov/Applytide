import { Button, Card } from "../../../components/ui";

export default function NotificationsForm({ values, onChange, onSubmit, loading }) {
  return (
    <Card className="p-6 glass-card border border-white/10">
      <h3 className="text-xl font-semibold text-white mb-6">Notification Preferences</h3>
      <p className="text-gray-300 mb-6">Choose which job search notifications you'd like to receive via email.</p>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-6">
          <h4 className="text-lg font-medium text-white">Application Management</h4>

          <div className="space-y-4">
            <div className="flex items-start justify-between p-4 bg-black/20 rounded-lg">
              <div className="flex-1">
                <h5 className="text-sm font-medium text-gray-200 mb-1">Application Deadlines</h5>
                <p className="text-xs text-gray-400">Get reminded before application deadlines close</p>
                <p className="text-xs text-indigo-400 mt-1">📅 "Application for Google closes in 3 days"</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  name="notification_deadlines"
                  checked={!!values.notification_deadlines}
                  onChange={onChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-start justify-between p-4 bg-black/20 rounded-lg">
              <div className="flex-1">
                <h5 className="text-sm font-medium text-gray-200 mb-1">Interview Reminders</h5>
                <p className="text-xs text-gray-400">Never miss an interview with advance notifications</p>
                <p className="text-xs text-indigo-400 mt-1">🎯 "Interview with Microsoft tomorrow at 2 PM"</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  name="notification_interviews"
                  checked={!!values.notification_interviews}
                  onChange={onChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-start justify-between p-4 bg-black/20 rounded-lg">
              <div className="flex-1">
                <h5 className="text-sm font-medium text-gray-200 mb-1">Status Updates</h5>
                <p className="text-xs text-gray-400">Know when your application status changes</p>
                <p className="text-xs text-indigo-400 mt-1">📊 "Your Apple application moved to 'Under Review'"</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  name="notification_status_updates"
                  checked={!!values.notification_status_updates}
                  onChange={onChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          <h4 className="text-lg font-medium text-white pt-4">Job Discovery</h4>

          <div className="space-y-4">
            <div className="flex items-start justify-between p-4 bg-black/20 rounded-lg">
              <div className="flex-1">
                <h5 className="text-sm font-medium text-gray-200 mb-1">Job Match Alerts</h5>
                <p className="text-xs text-gray-400">Get notified about new jobs that match your preferences</p>
                <p className="text-xs text-indigo-400 mt-1">🎯 "5 new Software Engineer jobs in San Francisco"</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  name="notification_job_matches"
                  checked={!!values.notification_job_matches}
                  onChange={onChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-start justify-between p-4 bg-black/20 rounded-lg">
              <div className="flex-1">
                <h5 className="text-sm font-medium text-gray-200 mb-1">Weekly Summary</h5>
                <p className="text-xs text-gray-400">Weekly progress report with application stats</p>
                <p className="text-xs text-indigo-400 mt-1">📈 "You applied to 7 jobs this week - keep it up!"</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  name="notification_weekly_summary"
                  checked={!!values.notification_weekly_summary}
                  onChange={onChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <Button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {loading ? "Saving..." : "Save Notification Preferences"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
