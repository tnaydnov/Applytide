import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useToast } from "../lib/toast";
import api from "../lib/api";
import {
  checkGoogleConnection,
  createReminder as createGoogleReminder,
  getReminders as getGoogleReminders,
  getGoogleCalendarEvents,
  deleteReminder as deleteCalendarReminder,
  importGoogleEventAsReminder,
  getReminderNotes,
  addReminderNote,
  updateReminder,
  updateReminderNote,
  deleteReminderNote,
} from "../services/googleCalendar";

/* -------------------------------- Mobile Reminder Card -------------------------------- */
function MobileReminderCard({ reminder, onEdit, onDelete, onToggleComplete }) {
  const [expanded, setExpanded] = useState(false);
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    if (diffDays <= 7) return `In ${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  const getPriorityColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'interview':
      case 'phone screen':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'follow up':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'application deadline':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const isOverdue = new Date(reminder.scheduled_at) < new Date() && !reminder.completed;

  return (
    <div className={`mobile-card border-2 ${
      isOverdue 
        ? 'bg-red-500/10 border-red-500/40' 
        : reminder.completed 
        ? 'bg-green-500/10 border-green-500/30 opacity-75'
        : 'bg-gray-800/50 border-gray-700/50'
    }`}>
      <div className="mobile-space-sm">
        <div className="mobile-flex-between mb-2">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <button
              onClick={() => onToggleComplete(reminder)}
              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                reminder.completed
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-500 hover:border-green-500'
              }`}
            >
              {reminder.completed && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <h3 className={`mobile-subtitle truncate ${
              reminder.completed ? 'line-through text-gray-500' : 'text-white'
            }`}>
              {reminder.name || reminder.title}
            </h3>
          </div>
          
          {reminder.type && (
            <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getPriorityColor(reminder.type)}`}>
              {reminder.type}
            </span>
          )}
        </div>

        <div className="mobile-flex-between text-sm">
          <div className="flex items-center space-x-3">
            <span className={`flex items-center ${
              isOverdue ? 'text-red-400' : 'text-gray-400'
            }`}>
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(reminder.scheduled_at)}
            </span>
            {reminder.scheduled_at && (
              <span className="text-gray-500">
                {formatTime(reminder.scheduled_at)}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(reminder)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(reminder)}
              className="p-1 hover:bg-red-700 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {reminder.notes && (
          <div className="mt-3">
            <p className={`mobile-body ${
              expanded ? '' : 'line-clamp-2'
            } ${reminder.completed ? 'text-gray-500' : 'text-gray-300'}`}>
              {reminder.notes}
            </p>
            {reminder.notes.length > 100 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-blue-400 text-sm hover:text-blue-300 mt-1"
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {reminder.application_id && (
          <div className="mt-2 pt-2 border-t border-gray-700/30">
            <span className="mobile-caption text-blue-400">
              📋 Linked to application
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Mobile Reminder Modal -------------------------------- */
function MobileReminderModal({ isOpen, onClose, reminder, onSubmit, applications }) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'Follow up',
    scheduled_at: '',
    notes: '',
    application_id: '',
    ...reminder
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (reminder) {
      setFormData({
        title: reminder.title || reminder.name || '',
        type: reminder.type || 'Follow up',
        scheduled_at: reminder.scheduled_at || '',
        notes: reminder.notes || '',
        application_id: reminder.application_id || '',
      });
    } else {
      setFormData({
        title: '',
        type: 'Follow up',
        scheduled_at: '',
        notes: '',
        application_id: '',
      });
    }
  }, [reminder]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-800 rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700">
          <div className="mobile-flex-between">
            <h3 className="mobile-title">
              {reminder ? 'Edit Reminder' : 'New Reminder'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block mobile-caption text-gray-300 mb-2">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full mobile-btn bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Follow up on application"
            />
          </div>

          <div className="mobile-grid-2">
            <div>
              <label className="block mobile-caption text-gray-300 mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full mobile-btn bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Follow up">Follow up</option>
                <option value="Interview">Interview</option>
                <option value="Phone Screen">Phone Screen</option>
                <option value="Application Deadline">Application Deadline</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block mobile-caption text-gray-300 mb-2">Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={formData.scheduled_at ? new Date(formData.scheduled_at).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({...formData, scheduled_at: e.target.value})}
                className="w-full mobile-btn bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {applications.length > 0 && (
            <div>
              <label className="block mobile-caption text-gray-300 mb-2">Link to Application</label>
              <select
                value={formData.application_id}
                onChange={(e) => setFormData({...formData, application_id: e.target.value})}
                className="w-full mobile-btn bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No application</option>
                {applications.map(app => (
                  <option key={app.id} value={app.id}>
                    {app.job_title} - {app.company_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block mobile-caption text-gray-300 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows="4"
              className="w-full mobile-btn bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Additional notes or details..."
            />
          </div>

          {/* Actions */}
          <div className="mobile-grid-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="mobile-btn bg-gray-600 hover:bg-gray-700 text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mobile-btn bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white"
            >
              {isSubmitting ? 'Saving...' : reminder ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------- Quick Stats -------------------------------- */
function MobileQuickStats({ reminders }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const stats = {
    overdue: reminders.filter(r => 
      !r.completed && new Date(r.scheduled_at) < today
    ).length,
    today: reminders.filter(r => 
      !r.completed && 
      new Date(r.scheduled_at).toDateString() === today.toDateString()
    ).length,
    thisWeek: reminders.filter(r => 
      !r.completed && 
      new Date(r.scheduled_at) >= today && 
      new Date(r.scheduled_at) < nextWeek
    ).length,
    completed: reminders.filter(r => r.completed).length
  };

  return (
    <div className="mobile-grid-2">
      <div className="mobile-card bg-red-500/10 border-2 border-red-500/30">
        <div className="text-center">
          <div className="mobile-title text-red-400">{stats.overdue}</div>
          <div className="mobile-caption text-red-300">Overdue</div>
        </div>
      </div>
      <div className="mobile-card bg-yellow-500/10 border-2 border-yellow-500/30">
        <div className="text-center">
          <div className="mobile-title text-yellow-400">{stats.today}</div>
          <div className="mobile-caption text-yellow-300">Today</div>
        </div>
      </div>
      <div className="mobile-card bg-blue-500/10 border-2 border-blue-500/30">
        <div className="text-center">
          <div className="mobile-title text-blue-400">{stats.thisWeek}</div>
          <div className="mobile-caption text-blue-300">This Week</div>
        </div>
      </div>
      <div className="mobile-card bg-green-500/10 border-2 border-green-500/30">
        <div className="text-center">
          <div className="mobile-title text-green-400">{stats.completed}</div>
          <div className="mobile-caption text-green-300">Completed</div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Main Reminders Page -------------------------------- */
export default function MobileRemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, completed, overdue
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const connected = await checkGoogleConnection();
      setIsGoogleConnected(connected);
      
      const apps = await api.getApplicationCards();
      setApplications(Array.isArray(apps) ? apps : []);

      const r = await getGoogleReminders();
      setReminders(Array.isArray(r) ? r.map(x => ({
        ...x,
        name: x.title,
        scheduled_at: x.due_date,
        notes: x.description || "",
        application_id: String(x.application_id || ""),
      })) : []);
    } catch (err) {
      console.error("Failed to load data:", err);
      toast.error("Failed to load reminders");
      setApplications([]);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredReminders = useMemo(() => {
    const now = new Date();
    
    return reminders.filter(reminder => {
      switch (filter) {
        case 'pending':
          return !reminder.completed;
        case 'completed':
          return reminder.completed;
        case 'overdue':
          return !reminder.completed && new Date(reminder.scheduled_at) < now;
        default:
          return true;
      }
    }).sort((a, b) => {
      // Sort by date, with overdue first
      const dateA = new Date(a.scheduled_at);
      const dateB = new Date(b.scheduled_at);
      
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1; // Completed items last
      }
      
      return dateA - dateB;
    });
  }, [reminders, filter]);

  const handleCreateReminder = async (formData) => {
    try {
      await createGoogleReminder({
        title: formData.title,
        due_date: formData.scheduled_at,
        description: formData.notes,
        type: formData.type,
        application_id: formData.application_id || null
      });
      toast.success('Reminder created successfully');
      setShowReminderModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error('Failed to create reminder');
    }
  };

  const handleEditReminder = async (formData) => {
    try {
      await updateReminder(editingReminder.id, {
        title: formData.title,
        due_date: formData.scheduled_at,
        description: formData.notes,
        type: formData.type,
        application_id: formData.application_id || null
      });
      toast.success('Reminder updated successfully');
      setShowReminderModal(false);
      setEditingReminder(null);
      loadData();
    } catch (error) {
      console.error('Error updating reminder:', error);
      toast.error('Failed to update reminder');
    }
  };

  const handleToggleComplete = async (reminder) => {
    try {
      await updateReminder(reminder.id, {
        completed: !reminder.completed
      });
      toast.success(reminder.completed ? 'Reminder marked as incomplete' : 'Reminder completed');
      loadData();
    } catch (error) {
      console.error('Error toggling reminder:', error);
      toast.error('Failed to update reminder');
    }
  };

  const handleDeleteReminder = async (reminder) => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      try {
        await deleteCalendarReminder(reminder.id);
        toast.success('Reminder deleted');
        loadData();
      } catch (error) {
        console.error('Error deleting reminder:', error);
        toast.error('Failed to delete reminder');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="mobile-body text-gray-400">Loading reminders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="mobile-container">
        {/* Header */}
        <div className="mobile-space-xl">
          <h1 className="mobile-title">Reminders</h1>
          <p className="mobile-body text-gray-400">
            Stay on top of your job search tasks
          </p>
        </div>

        {/* Google Calendar Status */}
        {!isGoogleConnected && (
          <div className="mobile-card bg-yellow-500/10 border-2 border-yellow-500/30 mobile-space-lg">
            <div className="mobile-flex-center mobile-space-sm">
              <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mobile-subtitle text-yellow-300 text-center">Google Calendar Not Connected</h3>
            <p className="mobile-body text-yellow-200/80 text-center mb-4">
              Connect your Google Calendar to sync reminders and get the full experience.
            </p>
            <button className="w-full mobile-btn bg-yellow-600 hover:bg-yellow-700 text-white">
              Connect Google Calendar
            </button>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mobile-space-lg">
          <MobileQuickStats reminders={reminders} />
        </div>

        {/* Filter & Add Button */}
        <div className="mobile-space-lg">
          <div className="mobile-flex-between mb-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="mobile-btn bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Reminders</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
            </select>
            
            <button
              onClick={() => {
                setEditingReminder(null);
                setShowReminderModal(true);
              }}
              className="mobile-btn bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add
            </button>
          </div>
        </div>

        {/* Reminders List */}
        <div className="mobile-space-xl">
          {filteredReminders.length > 0 ? (
            <div className="space-y-3">
              {filteredReminders.map(reminder => (
                <MobileReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onEdit={(reminder) => {
                    setEditingReminder(reminder);
                    setShowReminderModal(true);
                  }}
                  onDelete={handleDeleteReminder}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>
          ) : (
            <div className="mobile-card bg-gray-800/30 border border-gray-700/50 text-center">
              <div className="mobile-flex-center mobile-space-md">
                <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 17H4l5 5v-5zM12 3v3m0 12v3m9-9h-3M3 12h3" />
                </svg>
              </div>
              <h3 className="mobile-subtitle text-gray-400 mb-2">
                {filter === 'all' ? 'No reminders yet' : `No ${filter} reminders`}
              </h3>
              <p className="mobile-body text-gray-500 mb-4">
                {filter === 'all' 
                  ? 'Create your first reminder to stay organized'
                  : `No reminders match the "${filter}" filter`
                }
              </p>
              {filter === 'all' && (
                <button
                  onClick={() => {
                    setEditingReminder(null);
                    setShowReminderModal(true);
                  }}
                  className="mobile-btn bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create First Reminder
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reminder Modal */}
      <MobileReminderModal
        isOpen={showReminderModal}
        onClose={() => {
          setShowReminderModal(false);
          setEditingReminder(null);
        }}
        reminder={editingReminder}
        onSubmit={editingReminder ? handleEditReminder : handleCreateReminder}
        applications={applications}
      />
    </div>
  );
}