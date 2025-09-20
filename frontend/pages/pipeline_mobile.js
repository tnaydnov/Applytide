import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { api, connectWS } from "../lib/api";
import { Button, Card, Badge } from "../components/ui";
import { useToast } from "../lib/toast";

/* --------------------------------- stages --------------------------------- */
const DEFAULT_STAGES = [
  "Applied",
  "Phone Screen", 
  "Tech Interview",
  "Final Round",
  "Offer",
  "Accepted",
  "Rejected",
];

/* ---------------------------------- icons --------------------------------- */
const renderIcon = (iconName, className = "w-4 h-4") => {
  const iconMap = {
    mail: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    phone: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    code: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    users: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
    building: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    star: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    check: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    x: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    trash: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    edit: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    move: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  };
  
  return iconMap[iconName] || null;
};

const getStageIcon = (stage) => {
  const stageIconMap = {
    "Applied": "mail",
    "Phone Screen": "phone", 
    "Tech Interview": "code",
    "Final Round": "users",
    "Offer": "star",
    "Accepted": "check",
    "Rejected": "x",
  };
  
  return stageIconMap[stage] || "building";
};

const getStageColor = (stage) => {
  const colorMap = {
    "Applied": "bg-blue-500/20 text-blue-300",
    "Phone Screen": "bg-yellow-500/20 text-yellow-300",
    "Tech Interview": "bg-purple-500/20 text-purple-300", 
    "Final Round": "bg-orange-500/20 text-orange-300",
    "Offer": "bg-green-500/20 text-green-300",
    "Accepted": "bg-emerald-500/20 text-emerald-300",
    "Rejected": "bg-red-500/20 text-red-300",
  };
  
  return colorMap[stage] || "bg-gray-500/20 text-gray-300";
};

/* -------------------------------- Mobile Application Card -------------------------------- */
function MobileApplicationCard({ application, onMove, onDelete, onEdit }) {
  const [showActions, setShowActions] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  
  const stageColor = getStageColor(application.stage);
  const stageIcon = getStageIcon(application.stage);
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <div className="mobile-card bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm">
        {/* Header */}
        <div className="mobile-flex-between mobile-space-sm">
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 rounded-lg ${stageColor}`}>
              {renderIcon(stageIcon, "w-4 h-4")}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mobile-subtitle truncate">{application.job_title}</h3>
              <p className="mobile-caption text-gray-400 truncate">{application.company_name}</p>
            </div>
          </div>
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            {renderIcon("move", "w-4 h-4 text-gray-400")}
          </button>
        </div>

        {/* Status & Date */}
        <div className="mobile-flex-between mobile-space-sm">
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${stageColor}`}>
            {application.stage}
          </span>
          {application.applied_at && (
            <span className="mobile-caption text-gray-500">
              {formatDate(application.applied_at)}
            </span>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="mobile-grid-2 mobile-space-sm pt-2 border-t border-gray-700/50">
            <button
              onClick={() => setShowMoveModal(true)}
              className="mobile-btn bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2"
            >
              {renderIcon("move", "w-4 h-4")}
              <span>Move</span>
            </button>
            <button
              onClick={() => onEdit(application)}
              className="mobile-btn bg-gray-600 hover:bg-gray-700 text-white flex items-center justify-center space-x-2"
            >
              {renderIcon("edit", "w-4 h-4")}
              <span>Edit</span>
            </button>
          </div>
        )}
        
        {/* Location & Salary */}
        {(application.location || application.salary_range) && (
          <div className="pt-2 border-t border-gray-700/50 mobile-space-sm">
            {application.location && (
              <p className="mobile-caption text-gray-400">📍 {application.location}</p>
            )}
            {application.salary_range && (
              <p className="mobile-caption text-green-400">💰 {application.salary_range}</p>
            )}
          </div>
        )}
      </div>

      {/* Move Modal */}
      {showMoveModal && (
        <MobileMoveModal
          application={application}
          onMove={(stage) => {
            onMove(application.id, stage);
            setShowMoveModal(false);
            setShowActions(false);
          }}
          onClose={() => setShowMoveModal(false)}
        />
      )}
    </>
  );
}

/* -------------------------------- Mobile Move Modal -------------------------------- */
function MobileMoveModal({ application, onMove, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-800 rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto">
        <div className="mobile-flex-between mobile-space-lg">
          <h3 className="mobile-title">Move Application</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {renderIcon("x", "w-5 h-5 text-gray-400")}
          </button>
        </div>
        
        <div className="mobile-space-sm">
          <p className="mobile-body text-gray-400">Moving: {application.job_title}</p>
          <p className="mobile-caption text-gray-500">{application.company_name}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {DEFAULT_STAGES.map((stage) => (
            <button
              key={stage}
              onClick={() => onMove(stage)}
              className={`mobile-btn flex items-center justify-center space-x-2 ${
                application.stage === stage
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              <span className="flex items-center space-x-1">
                {renderIcon(getStageIcon(stage), "w-4 h-4")}
                <span className="text-sm font-medium truncate">{stage}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Main Pipeline Page -------------------------------- */
export default function PipelinePage() {
  const [applications, setApplications] = useState([]);
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('All Applications');
  const toast = useToast();
  const router = useRouter();

  // Load applications
  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const response = await api.getApplications();
      if (response && Array.isArray(response)) {
        setApplications(response);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveApplication = async (applicationId, newStage) => {
    try {
      await api.updateApplication(applicationId, { stage: newStage });
      setApplications(apps => 
        apps.map(app => 
          app.id === applicationId 
            ? { ...app, stage: newStage }
            : app
        )
      );
      toast.success(`Application moved to ${newStage}`);
    } catch (error) {
      console.error('Error moving application:', error);
      toast.error('Failed to move application');
    }
  };

  const handleEditApplication = (application) => {
    router.push(`/applications/${application.id}/edit`);
  };

  const handleDeleteApplication = async (applicationId) => {
    if (confirm('Are you sure you want to delete this application?')) {
      try {
        await api.deleteApplication(applicationId);
        setApplications(apps => apps.filter(app => app.id !== applicationId));
        toast.success('Application deleted');
      } catch (error) {
        console.error('Error deleting application:', error);
        toast.error('Failed to delete application');
      }
    }
  };

  // Filter applications
  const filteredApplications = useMemo(() => {
    let filtered = applications;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => 
        app.job_title?.toLowerCase().includes(query) ||
        app.company_name?.toLowerCase().includes(query) ||
        app.location?.toLowerCase().includes(query)
      );
    }
    
    if (selectedStage && selectedStage !== 'All Applications') {
      filtered = filtered.filter(app => app.stage === selectedStage);
    }
    
    return filtered;
  }, [applications, searchQuery, selectedStage]);

  // Group by stage for stats
  const applicationsByStage = useMemo(() => {
    const grouped = {};
    stages.forEach(stage => {
      grouped[stage] = applications.filter(app => app.stage === stage);
    });
    return grouped;
  }, [applications, stages]);

  const totalApplications = applications.length;
  const successRate = totalApplications > 0 
    ? Math.round((applicationsByStage['Accepted']?.length || 0) / totalApplications * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="mobile-container">
          <div className="mobile-flex-center" style={{ minHeight: '50vh' }}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mobile-space-sm"></div>
              <p className="mobile-body text-gray-400">Loading applications...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="mobile-container">
        {/* Header */}
        <div className="mobile-space-xl">
          <h1 className="mobile-title">Your Pipeline</h1>
          <p className="mobile-body text-gray-400">
            Manage and track your job applications in board view
          </p>
        </div>

        {/* Stats */}
        <div className="mobile-grid-2 mobile-space-xl">
          <div className="mobile-card bg-green-500/10 border border-green-500/20">
            <div className="mobile-flex-center mobile-space-sm">
              {renderIcon("star", "w-6 h-6 text-green-400")}
            </div>
            <div className="text-center">
              <p className="mobile-caption text-green-400">Offers</p>
              <p className="text-2xl font-bold text-white">
                {applicationsByStage['Offer']?.length || 0}
              </p>
            </div>
          </div>
          <div className="mobile-card bg-purple-500/10 border border-purple-500/20">
            <div className="mobile-flex-center mobile-space-sm">
              {renderIcon("users", "w-6 h-6 text-purple-400")}
            </div>
            <div className="text-center">
              <p className="mobile-caption text-purple-400">Success Rate</p>
              <p className="text-2xl font-bold text-white">{successRate}%</p>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="mobile-card bg-gray-800/30 border border-gray-700/50 mobile-space-xl">
          <div className="mobile-space-md">
            <input
              type="text"
              placeholder="Search applications by job title, company, or location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full mobile-btn bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full mobile-btn bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="All Applications">All Applications</option>
              {stages.map(stage => (
                <option key={stage} value={stage}>
                  {stage} ({applicationsByStage[stage]?.length || 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Applications List */}
        <div className="mobile-space-xl">
          <h2 className="mobile-subtitle mobile-space-md">
            Your Applications
            <span className="ml-2 px-2 py-1 bg-gray-700 rounded-full text-xs text-gray-300">
              {filteredApplications.length}
            </span>
          </h2>

          {filteredApplications.length === 0 ? (
            <div className="mobile-card bg-gray-800/30 border border-gray-700/50 text-center">
              <div className="mobile-flex-center mobile-space-md">
                {renderIcon("users", "w-12 h-12 text-gray-500")}
              </div>
              <h3 className="mobile-subtitle text-gray-400">No applications found</h3>
              <p className="mobile-body text-gray-500 mobile-space-md">
                {searchQuery || selectedStage !== 'All Applications'
                  ? 'Try adjusting your search or filter'
                  : 'Start by adding your first job application'
                }
              </p>
              {!searchQuery && selectedStage === 'All Applications' && (
                <Link href="/jobs">
                  <button className="mobile-btn bg-blue-600 hover:bg-blue-700 text-white">
                    Add First Application
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApplications.map((application) => (
                <MobileApplicationCard
                  key={application.id}
                  application={application}
                  onMove={handleMoveApplication}
                  onEdit={handleEditApplication}
                  onDelete={handleDeleteApplication}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pipeline Settings */}
        <div className="mobile-card bg-gray-800/30 border border-gray-700/50 mobile-space-xl">
          <div className="mobile-flex-between mobile-space-md">
            <h3 className="mobile-subtitle">Pipeline Settings</h3>
            <button className="mobile-btn bg-blue-600 hover:bg-blue-700 text-white text-sm">
              Customize Pipeline
            </button>
          </div>
          <p className="mobile-caption text-gray-400">
            Customize your application stages and workflow
          </p>
        </div>
      </div>
    </div>
  );
}