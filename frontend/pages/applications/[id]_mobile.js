import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../lib/toast";
import Link from "next/link";

/* -------------------------------- Mobile Status Badge -------------------------------- */
function MobileStatusBadge({ status, large = false }) {
  const statusConfig = {
    Applied: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: "📨" },
    "Phone Screen": { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: "📞" },
    Tech: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: "💻" },
    "On-site": { color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30", icon: "🏢" },
    Offer: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: "🎉" },
    Accepted: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: "✅" },
    Rejected: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: "❌" },
  };

  const config = statusConfig[status] || statusConfig.Applied;
  
  return (
    <div className={`inline-flex items-center px-3 py-2 rounded-lg border-2 ${config.color} ${
      large ? 'text-base' : 'text-sm'
    }`}>
      <span className="mr-2">{config.icon}</span>
      <span className="font-medium">{status}</span>
    </div>
  );
}

/* -------------------------------- Mobile Info Card -------------------------------- */
function MobileInfoCard({ title, children, icon }) {
  return (
    <div className="mobile-card bg-gray-800/30 border border-gray-700/50">
      <div className="mobile-flex-between mb-3">
        <h3 className="mobile-subtitle text-white flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </h3>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

/* -------------------------------- Mobile Field Row -------------------------------- */
function MobileFieldRow({ label, value, href }) {
  const content = (
    <div className="mobile-flex-between py-2">
      <span className="mobile-caption text-gray-400">{label}</span>
      <span className={`mobile-body text-right flex-1 ml-4 ${
        href ? 'text-blue-400' : 'text-white'
      }`}>
        {value || '—'}
      </span>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:bg-gray-700/20 rounded px-2 -mx-2 transition-colors">
        {content}
      </a>
    );
  }

  return (
    <div className="px-2 -mx-2">
      {content}
    </div>
  );
}

/* -------------------------------- Mobile Stage Timeline -------------------------------- */
function MobileStageTimeline({ stages }) {
  if (!stages || stages.length === 0) {
    return (
      <div className="text-center py-6">
        <svg className="w-8 h-8 text-gray-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h2m9-10a2 2 0 012 2v10a2 2 0 01-2 2H9m0-10a2 2 0 00-2-2H7" />
        </svg>
        <p className="mobile-body text-gray-500">No interview stages yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stages.map((stage, index) => (
        <div key={stage.id || index} className="relative">
          {/* Timeline line */}
          {index < stages.length - 1 && (
            <div className="absolute left-4 top-10 w-0.5 h-8 bg-gray-600"></div>
          )}
          
          <div className="flex items-start space-x-3">
            {/* Timeline dot */}
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-white text-sm font-bold">{index + 1}</span>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="mobile-flex-between mb-1">
                <h4 className="mobile-subtitle text-white">{stage.name}</h4>
                {stage.scheduled_at && (
                  <span className="mobile-caption text-gray-400 flex-shrink-0 ml-2">
                    {new Date(stage.scheduled_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              
              {stage.notes && (
                <p className="mobile-body text-gray-300 mt-1">{stage.notes}</p>
              )}
              
              {stage.completed && (
                <div className="flex items-center mt-2">
                  <svg className="w-4 h-4 text-green-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="mobile-caption text-green-400">Completed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- Mobile Notes Section -------------------------------- */
function MobileNotesSection({ notes, onAddNote }) {
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    setIsAdding(true);
    try {
      await onAddNote(newNote.trim());
      setNewNote('');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      {notes && notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note, index) => (
            <div key={index} className="bg-gray-700/30 rounded-lg p-3">
              <p className="mobile-body text-gray-300 mb-2">{note.content}</p>
              <span className="mobile-caption text-gray-500">
                {new Date(note.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <svg className="w-8 h-8 text-gray-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <p className="mobile-body text-gray-500">No notes yet</p>
        </div>
      )}
      
      {/* Add Note */}
      <div className="space-y-3 pt-3 border-t border-gray-700/30">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note about this application..."
          rows="3"
          className="w-full mobile-btn bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <button
          onClick={handleAddNote}
          disabled={!newNote.trim() || isAdding}
          className="w-full mobile-btn bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white"
        >
          {isAdding ? 'Adding...' : 'Add Note'}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------- Mobile Quick Actions -------------------------------- */
function MobileQuickActions({ application, onStatusChange }) {
  const quickStatuses = ["Phone Screen", "Tech", "On-site", "Offer", "Rejected"];
  
  return (
    <div className="mobile-card bg-blue-500/10 border-2 border-blue-500/30">
      <h3 className="mobile-subtitle text-blue-300 mb-3">Quick Status Update</h3>
      <div className="grid grid-cols-2 gap-2">
        {quickStatuses.map(status => (
          <button
            key={status}
            onClick={() => onStatusChange(status)}
            className={`mobile-btn text-sm transition-colors ${
              application?.status === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            {status}
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- Main Application Detail Page -------------------------------- */
export default function MobileAppDetailPage() {
  const router = useRouter();
  const toast = useToast();

  const appId = useMemo(
    () => (Array.isArray(router.query.id) ? router.query.id[0] : router.query.id),
    [router.query.id]
  );

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, stages, notes

  async function load(idToLoad) {
    if (!idToLoad) return;
    setLoading(true);
    try {
      const appData = await api.getAppDetail(idToLoad);
      setData(appData);
    } catch (err) {
      console.error('Error loading application:', err);
      toast.error("Failed to load application details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!router.isReady || !appId) return;
    load(appId);
  }, [router.isReady, appId]);

  async function handleStatusChange(newStatus) {
    try {
      await api.updateAppStatus(appId, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      load(appId);
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error("Failed to update status");
    }
  }

  async function handleAddNote(noteContent) {
    try {
      await api.addApplicationNote(appId, noteContent);
      toast.success("Note added successfully");
      load(appId);
    } catch (err) {
      console.error('Error adding note:', err);
      toast.error("Failed to add note");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="mobile-body text-gray-400">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!data?.application) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="mobile-container text-center">
          <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="mobile-title text-gray-400 mb-2">Application Not Found</h2>
          <p className="mobile-body text-gray-500 mb-4">
            The application you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/pipeline">
            <button className="mobile-btn bg-blue-600 hover:bg-blue-700 text-white">
              Back to Pipeline
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const app = data.application;
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="mobile-container">
        {/* Header */}
        <div className="mobile-space-lg">
          <div className="mobile-flex-between mb-3">
            <Link href="/pipeline">
              <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </Link>
            <MobileStatusBadge status={app.status} large />
          </div>
          
          <h1 className="mobile-title mb-2">{app.job_title}</h1>
          <p className="mobile-subtitle text-blue-400 mb-3">{app.company_name}</p>
          
          {app.location && (
            <p className="mobile-body text-gray-400 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {app.location}
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mobile-space-lg">
          <MobileQuickActions application={app} onStatusChange={handleStatusChange} />
        </div>

        {/* Tab Navigation */}
        <div className="mobile-space-lg">
          <div className="flex space-x-2 bg-gray-800/30 p-1 rounded-lg">
            {[
              { id: 'overview', label: 'Overview', icon: '📋' },
              { id: 'stages', label: 'Stages', icon: '🎯' },
              { id: 'notes', label: 'Notes', icon: '📝' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mobile-space-xl">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Job Details */}
              <MobileInfoCard title="Job Details" icon="💼">
                <MobileFieldRow label="Applied" value={formatDate(app.created_at)} />
                <MobileFieldRow label="Salary" value={app.salary_range} />
                <MobileFieldRow label="Job Type" value={app.job_type} />
                <MobileFieldRow label="Remote" value={app.remote_type} />
                {app.job_url && (
                  <MobileFieldRow label="Job Posting" value="View Original" href={app.job_url} />
                )}
              </MobileInfoCard>

              {/* Company Info */}
              <MobileInfoCard title="Company" icon="🏢">
                <MobileFieldRow label="Company" value={app.company_name} />
                {app.company_size && (
                  <MobileFieldRow label="Size" value={app.company_size} />
                )}
                {app.company_url && (
                  <MobileFieldRow label="Website" value="Visit Website" href={app.company_url} />
                )}
              </MobileInfoCard>

              {/* Job Description */}
              {app.description && (
                <MobileInfoCard title="Description" icon="📄">
                  <div className="bg-gray-700/30 rounded-lg p-3">
                    <p className="mobile-body text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {app.description}
                    </p>
                  </div>
                </MobileInfoCard>
              )}

              {/* Skills */}
              {app.skills && app.skills.length > 0 && (
                <MobileInfoCard title="Skills" icon="🛠️">
                  <div className="flex flex-wrap gap-2">
                    {app.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </MobileInfoCard>
              )}
            </div>
          )}

          {activeTab === 'stages' && (
            <MobileInfoCard title="Interview Process" icon="🎯">
              <MobileStageTimeline stages={data.stages || []} />
            </MobileInfoCard>
          )}

          {activeTab === 'notes' && (
            <MobileInfoCard title="Notes" icon="📝">
              <MobileNotesSection 
                notes={data.notes || []} 
                onAddNote={handleAddNote}
              />
            </MobileInfoCard>
          )}
        </div>
      </div>
    </div>
  );
}