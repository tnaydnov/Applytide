import { Card } from "../../../components/ui";

export default function ActivityPanel() {
  return (
    <Card className="p-6 glass-card border border-white/10">
      <h3 className="text-xl font-semibold text-white mb-6">Account Activity</h3>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-black/20 rounded-lg">
            <div className="text-2xl font-bold text-indigo-400 mb-2">0</div>
            <div className="text-sm text-gray-300">Applications</div>
          </div>
          <div className="text-center p-4 bg-black/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-400 mb-2">0</div>
            <div className="text-sm text-gray-300">Interviews</div>
          </div>
          <div className="text-center p-4 bg-black/20 rounded-lg">
            <div className="text-2xl font-bold text-green-400 mb-2">0</div>
            <div className="text-sm text-gray-300">Job Offers</div>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-medium text-white mb-4">Recent Activity</h4>
          <div className="text-center py-8 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No recent activity</p>
            <p className="text-sm">Start by adding your first job application!</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
