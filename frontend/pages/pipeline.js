import { useEffect, useRef, useState } from "react";
import { api, connectWS } from "../lib/api";
import Link from "next/link";
import { Button, Card, Badge } from "../components/ui";
import { useToast } from '../lib/toast';

const STATUSES = ["Saved", "Applied", "Phone Screen", "Tech", "On-site", "Offer", "Accepted", "Rejected"];

const statusConfig = {
  "Saved": { color: "bg-gray-100 text-gray-800", icon: "💾", gradient: "from-gray-50 to-gray-100" },
  "Applied": { color: "bg-blue-100 text-blue-800", icon: "📨", gradient: "from-blue-50 to-blue-100" },
  "Phone Screen": { color: "bg-yellow-100 text-yellow-800", icon: "📞", gradient: "from-yellow-50 to-yellow-100" },
  "Tech": { color: "bg-purple-100 text-purple-800", icon: "💻", gradient: "from-purple-50 to-purple-100" },
  "On-site": { color: "bg-indigo-100 text-indigo-800", icon: "🏢", gradient: "from-indigo-50 to-indigo-100" },
  "Offer": { color: "bg-green-100 text-green-800", icon: "🎉", gradient: "from-green-50 to-green-100" },
  "Accepted": { color: "bg-emerald-100 text-emerald-800", icon: "✅", gradient: "from-emerald-50 to-emerald-100" },
  "Rejected": { color: "bg-red-100 text-red-800", icon: "❌", gradient: "from-red-50 to-red-100" }
};

function ApplicationCard({ application, onMove, statuses }) {
  const [showActions, setShowActions] = useState(false);
  const config = statusConfig[application.status] || statusConfig["Saved"];

  const availableStatuses = statuses.filter(s => s !== application.status);

  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-slideIn"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
              {application.job.title}
            </h4>
            {application.job.company_name && (
              <p className="text-sm text-indigo-600 font-medium mt-1">
                {application.job.company_name}
              </p>
            )}
            {application.job.location && (
              <p className="text-xs text-gray-500 mt-1 flex items-center">
                <span className="mr-1">📍</span>
                {application.job.location}
              </p>
            )}
          </div>
          <Badge variant="default" size="sm">
            <span className="mr-1">{config.icon}</span>
            {application.status}
          </Badge>
        </div>

        {application.job.source_url && (
          <a 
            href={application.job.source_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-indigo-600 transition-colors inline-flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mr-1">🔗</span>
            View Original
          </a>
        )}

        <div className={`transition-all duration-300 ${showActions ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0'} overflow-hidden`}>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <Link href={`/applications/${application.id}`}>
              <Button size="sm" variant="outline" className="text-xs">
                <span className="mr-1">👁️</span>
                View
              </Button>
            </Link>
            {availableStatuses.slice(0, 3).map(status => (
              <Button
                key={status}
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(application.id, status);
                }}
              >
                <span className="mr-1">{statusConfig[status].icon}</span>
                {status}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Column({ status, items, onMove, availableStatuses }) {
  const config = statusConfig[status];
  
  return (
    <div className="flex-shrink-0 w-80">
      <div className={`bg-gradient-to-br ${config.gradient} rounded-xl border border-gray-200 overflow-hidden`}>
        {/* Column Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">{config.icon}</span>
              <h3 className="font-semibold text-gray-900">{status}</h3>
            </div>
            <Badge variant="default" size="sm">
              {items.length}
            </Badge>
          </div>
        </div>

        {/* Column Content */}
        <div className="p-4 space-y-3 min-h-[200px] max-h-[600px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-3xl mb-2">{config.icon}</div>
              <p className="text-sm">No applications yet</p>
            </div>
          ) : (
            items.map((app, index) => (
              <div key={app.id} style={{ animationDelay: `${index * 100}ms` }}>
                <ApplicationCard 
                  application={app} 
                  onMove={onMove}
                  statuses={availableStatuses}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [columns, setColumns] = useState({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const wsRef = useRef(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const result = {};
      const promises = STATUSES.map(async (status) => {
        result[status] = await api.listCardsByStatus(status);
      });
      await Promise.all(promises);
      setColumns(result);
      
      // Calculate stats
      const totalApps = Object.values(result).flat().length;
      const activeApps = result["Applied"]?.length + result["Phone Screen"]?.length + result["Tech"]?.length + result["On-site"]?.length || 0;
      const offers = result["Offer"]?.length + result["Accepted"]?.length || 0;
      const successRate = totalApps > 0 ? Math.round((offers / totalApps) * 100) : 0;
      
      setStats({ totalApps, activeApps, offers, successRate });
    } catch (err) {
      toast.error("Failed to load pipeline data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // live updates
    wsRef.current = connectWS((evt) => {
      if (["stage_changed", "stage_added", "note_added"].includes(evt.type)) {
        load();
        toast.success("Pipeline updated!");
      }
    });
    return () => wsRef.current && wsRef.current.close();
  }, []);

  async function move(id, status) {
    try {
      await api.moveApp(id, status);
      await load();
      toast.success(`Application moved to ${status}`);
    } catch (err) {
      toast.error("Failed to move application");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 text-lg">Loading your pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Stats */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Application Pipeline</h1>
            <p className="text-gray-600 mt-1">Track your job applications across all stages</p>
          </div>
          <Link href="/jobs">
            <Button>
              <span className="mr-2">➕</span>
              Add Job
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center">
            <div className="text-2xl font-bold text-indigo-600 mb-1">
              {stats.totalApps}
            </div>
            <div className="text-sm text-gray-600">Total Applications</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-yellow-600 mb-1">
              {stats.activeApps}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {stats.offers}
            </div>
            <div className="text-sm text-gray-600">Offers</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {stats.successRate}%
            </div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </Card>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex space-x-6 min-w-max">
          {STATUSES.map(status => (
            <Column 
              key={status} 
              status={status} 
              items={columns[status] || []} 
              onMove={move}
              availableStatuses={STATUSES}
            />
          ))}
        </div>
      </div>

      {/* Empty State */}
      {Object.values(columns).flat().length === 0 && (
        <Card className="text-center py-16">
          <div className="space-y-6">
            <div className="text-6xl">🚀</div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">Start Your Job Hunt!</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Add your first job to begin tracking your application progress through our beautiful pipeline.
              </p>
            </div>
            <Link href="/jobs">
              <Button size="lg">
                <span className="mr-2">✨</span>
                Add Your First Job
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
