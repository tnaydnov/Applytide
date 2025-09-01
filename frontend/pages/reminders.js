import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Card, Button, Badge, Input, Select, Modal } from "../components/ui";
import { useToast } from "../lib/toast";
import api from "../lib/api";

export default function RemindersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState([]);
  const [applications, setApplications] = useState([]);
  const [filteredReminders, setFilteredReminders] = useState([]);
  const [filter, setFilter] = useState("upcoming"); // upcoming, overdue, all
  const [sortBy, setSortBy] = useState("scheduled_at");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReminder, setNewReminder] = useState({
    application_id: "",
    name: "",
    scheduled_at: "",
    notes: ""
  });
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  async function loadReminders() {
    setLoading(true);
    try {
      // Get all applications with their stages
      const apps = await api.getApplicationsWithStages();
      console.log("Applications with stages:", apps); // Debug log
      
      if (!Array.isArray(apps)) {
        console.warn("Applications data is not an array:", apps);
        setApplications([]);
        setReminders([]);
        return;
      }
      
      setApplications(apps);
      
      // Extract all scheduled stages (reminders) from applications
      const allReminders = [];
      for (const app of apps) {
        if (app.stages && Array.isArray(app.stages) && app.stages.length > 0) {
          const scheduledStages = app.stages.filter(stage => stage.scheduled_at);
          scheduledStages.forEach(stage => {
            allReminders.push({
              ...stage,
              application: app,
              job: app.job
            });
          });
        }
      }
      
      console.log("Found reminders:", allReminders); // Debug log
      setReminders(allReminders);
      
    } catch (err) {
      console.error("Reminders load error:", err);
      // Only show toast error for real API failures
      if (err.status && err.status >= 400) {
        toast.error(`Failed to load reminders: ${err.message || 'API Error'}`);
      } else if (err.message && !err.message.includes('not an array')) {
        toast.error(`Failed to load reminders: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReminders();
  }, []);

  useEffect(() => {
    // Filter and sort reminders
    let filtered = [...reminders];
    const now = new Date();
    
    if (filter === "upcoming") {
      filtered = filtered.filter(r => new Date(r.scheduled_at) >= now);
    } else if (filter === "overdue") {
      filtered = filtered.filter(r => new Date(r.scheduled_at) < now);
    }
    
    // Sort by selected criteria
    filtered.sort((a, b) => {
      if (sortBy === "scheduled_at") {
        return new Date(a.scheduled_at) - new Date(b.scheduled_at);
      } else if (sortBy === "created_at") {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === "company") {
        return (a.job?.company_name || "").localeCompare(b.job?.company_name || "");
      }
      return 0;
    });
    
    setFilteredReminders(filtered);
  }, [reminders, filter, sortBy]);

  async function createReminder(e) {
    e.preventDefault();
    if (!newReminder.application_id || !newReminder.name || !newReminder.scheduled_at) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setCreating(true);
    try {
      const payload = {
        name: newReminder.name,
        scheduled_at: new Date(newReminder.scheduled_at).toISOString(),
        notes: newReminder.notes || ""
      };
      
      await api.addStage(newReminder.application_id, payload);
      setNewReminder({ application_id: "", name: "", scheduled_at: "", notes: "" });
      setShowCreateModal(false);
      await loadReminders();
      toast.success("Reminder created successfully!");
    } catch (err) {
      toast.error(`Failed to create reminder: ${err.message || err}`);
    } finally {
      setCreating(false);
    }
  }

  async function deleteReminder(reminderId, applicationId) {
    if (!confirm("Are you sure you want to delete this reminder?")) return;
    
    try {
      await api.deleteStage(applicationId, reminderId);
      await loadReminders();
      toast.success("Reminder deleted successfully!");
    } catch (err) {
      toast.error(`Failed to delete reminder: ${err.message || err}`);
    }
  }

  function exportToCalendar(format = "ics") {
    if (filteredReminders.length === 0) {
      toast.error("No reminders to export");
      return;
    }
    
    let content = "";
    
    if (format === "ics") {
      // Generate ICS format for calendar import
      content = generateICSContent(filteredReminders);
      downloadFile(content, "jobflow-reminders.ics", "text/calendar");
    } else if (format === "json") {
      // Generate JSON export for backup
      content = JSON.stringify(filteredReminders, null, 2);
      downloadFile(content, "jobflow-reminders.json", "application/json");
    }
  }

  function exportUpcomingOnly() {
    const upcomingReminders = reminders.filter(r => new Date(r.scheduled_at) >= new Date());
    if (upcomingReminders.length === 0) {
      toast.error("No upcoming reminders to export");
      return;
    }
    
    const content = generateICSContent(upcomingReminders);
    downloadFile(content, "jobflow-upcoming-reminders.ics", "text/calendar");
  }

  function generateICSContent(reminders) {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//JobFlow Copilot//Reminders//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:JobFlow Reminders',
      'X-WR-CALDESC:Job search reminders and interviews from JobFlow Copilot'
    ];
    
    reminders.forEach(reminder => {
      const startDate = new Date(reminder.scheduled_at);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
      
      const formatDate = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      // Add categories based on reminder type
      let category = 'BUSINESS';
      let priority = '5'; // Normal priority
      if (reminder.name.toLowerCase().includes('interview')) {
        category = 'APPOINTMENT';
        priority = '3'; // High priority for interviews
      } else if (reminder.name.toLowerCase().includes('deadline')) {
        priority = '1'; // Highest priority for deadlines
      }
      
      ics.push(
        'BEGIN:VEVENT',
        `UID:${reminder.id}@jobflow-copilot.local`,
        `DTSTAMP:${now}`,
        `DTSTART:${formatDate(startDate)}`,
        `DTEND:${formatDate(endDate)}`,
        `SUMMARY:${escapeICSText(reminder.name)} - ${escapeICSText(reminder.job?.company_name || 'Unknown Company')}`,
        `DESCRIPTION:${escapeICSText(`Job: ${reminder.job?.title || 'Unknown Position'}\\nCompany: ${reminder.job?.company_name || 'Unknown Company'}\\nType: ${reminder.name}${reminder.notes ? '\\nNotes: ' + reminder.notes : ''}\\n\\nView in JobFlow: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/applications/${reminder.application_id}`)}`,
        `LOCATION:${escapeICSText(reminder.job?.location || '')}`,
        `URL:${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/applications/${reminder.application_id}`,
        `CATEGORIES:${category}`,
        `PRIORITY:${priority}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        'DESCRIPTION:JobFlow Reminder: 15 minutes until your reminder',
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-PT1H',
        'ACTION:EMAIL',
        'DESCRIPTION:JobFlow Reminder: 1 hour until your reminder',
        'SUMMARY:Upcoming JobFlow Reminder',
        'END:VALARM',
        'END:VEVENT'
      );
    });
    
    ics.push('END:VCALENDAR');
    return ics.join('\r\n');
  }

  function escapeICSText(text) {
    if (!text) return '';
    return text.replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n');
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${filename} downloaded successfully!`);
  }

  function getTimeUntil(dateString) {
    const now = new Date();
    const target = new Date(dateString);
    const diffMs = target - now;
    
    if (diffMs < 0) {
      const overdue = Math.abs(diffMs);
      const days = Math.floor(overdue / (1000 * 60 * 60 * 24));
      const hours = Math.floor((overdue % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      if (days > 0) return `${days} day${days > 1 ? 's' : ''} overdue`;
      if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} overdue`;
      return "Overdue";
    }
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    return "now";
  }

  function getReminderTypeColor(name) {
    const type = name.toLowerCase();
    if (type.includes('interview')) return 'bg-blue-100 text-blue-800';
    if (type.includes('follow')) return 'bg-green-100 text-green-800';
    if (type.includes('deadline')) return 'bg-red-100 text-red-800';
    if (type.includes('call') || type.includes('phone')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  }

  const stats = {
    total: reminders.length,
    upcoming: reminders.filter(r => new Date(r.scheduled_at) >= new Date()).length,
    overdue: reminders.filter(r => new Date(r.scheduled_at) < new Date()).length,
    thisWeek: reminders.filter(r => {
      const date = new Date(r.scheduled_at);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return date >= now && date <= weekFromNow;
    }).length
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600">Loading reminders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🗓️ Reminders & Calendar</h1>
          <p className="text-gray-600 mt-1">Manage your job search schedule and export to calendar apps</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => exportToCalendar("ics")}
              variant="outline"
              disabled={filteredReminders.length === 0}
              size="sm"
            >
              📅 Export Calendar
            </Button>
            <Button
              onClick={() => exportUpcomingOnly()}
              variant="outline"
              disabled={stats.upcoming === 0}
              size="sm"
            >
              ⏰ Export Upcoming
            </Button>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            ➕ Add Reminder
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Reminders</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <div className="text-3xl">📋</div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Upcoming</p>
              <p className="text-2xl font-bold text-green-900">{stats.upcoming}</p>
            </div>
            <div className="text-3xl">⏰</div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-rose-100 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Overdue</p>
              <p className="text-2xl font-bold text-red-900">{stats.overdue}</p>
            </div>
            <div className="text-3xl">⚠️</div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">This Week</p>
              <p className="text-2xl font-bold text-purple-900">{stats.thisWeek}</p>
            </div>
            <div className="text-3xl">📅</div>
          </div>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Filter & Sort</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Filter by Status"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="all">All Reminders</option>
              <option value="upcoming">Upcoming Only</option>
              <option value="overdue">Overdue Only</option>
            </Select>
            
            <Select
              label="Sort by"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="scheduled_at">Scheduled Date</option>
              <option value="created_at">Date Added</option>
              <option value="company">Company Name</option>
            </Select>
            
            <div className="flex items-end space-x-2">
              <Button
                onClick={() => exportToCalendar("json")}
                variant="outline"
                size="sm"
                disabled={filteredReminders.length === 0}
              >
                📁 Export JSON
              </Button>
              <Button
                onClick={loadReminders}
                variant="outline"
                size="sm"
              >
                🔄 Refresh
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🗓️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === "overdue" ? "No overdue reminders" : 
               filter === "upcoming" ? "No upcoming reminders" : 
               "No reminders found"}
            </h3>
            <p className="text-gray-600 mb-6">
              {reminders.length === 0 
                ? "Get started by creating your first reminder or scheduling follow-ups from your applications."
                : "Try adjusting your filters to see more reminders."
              }
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              ➕ Create First Reminder
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReminders.map(reminder => {
            const isOverdue = new Date(reminder.scheduled_at) < new Date();
            return (
              <Card key={reminder.id} className={`${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'} transition-all hover:shadow-md`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900">{reminder.name}</h3>
                          <Badge variant={isOverdue ? 'danger' : 'default'} className={getReminderTypeColor(reminder.name)}>
                            {reminder.name}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {reminder.job?.title} at {reminder.job?.company_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                          {new Date(reminder.scheduled_at).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                          {getTimeUntil(reminder.scheduled_at)}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                      {reminder.job?.location && (
                        <div className="flex items-center space-x-2">
                          <span>📍</span>
                          <span>{reminder.job.location}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <span>📅</span>
                        <span>Added {new Date(reminder.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {reminder.notes && (
                      <div className="bg-gray-100 rounded-lg p-3">
                        <p className="text-sm text-gray-700">{reminder.notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="flex items-center space-x-2">
                        <Link href={`/applications/${reminder.application_id}`}>
                          <Button size="sm" variant="outline">
                            👁️ View Application
                          </Button>
                        </Link>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => deleteReminder(reminder.id, reminder.application_id)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          🗑️ Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Reminder Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Reminder"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={createReminder}
              disabled={creating || !newReminder.application_id || !newReminder.name || !newReminder.scheduled_at}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                '✅ Create Reminder'
              )}
            </Button>
          </>
        }
      >
        <form onSubmit={createReminder} className="space-y-4">
          <Select
            label="Application"
            value={newReminder.application_id}
            onChange={e => setNewReminder({...newReminder, application_id: e.target.value})}
            required
          >
            <option value="">Select an application...</option>
            {applications.map(app => (
              <option key={app.id} value={app.id}>
                {app.job?.title} at {app.job?.company_name}
              </option>
            ))}
          </Select>
          
          <Select
            label="Reminder Type"
            value={newReminder.name}
            onChange={e => setNewReminder({...newReminder, name: e.target.value})}
            required
          >
            <option value="">Select type...</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Interview">Interview</option>
            <option value="Phone Screen">Phone Screen</option>
            <option value="Tech Interview">Tech Interview</option>
            <option value="Final Round">Final Round</option>
            <option value="Deadline">Application Deadline</option>
            <option value="Networking Call">Networking Call</option>
            <option value="Custom">Custom</option>
          </Select>
          
          <Input
            label="Scheduled Date & Time"
            type="datetime-local"
            value={newReminder.scheduled_at}
            onChange={e => setNewReminder({...newReminder, scheduled_at: e.target.value})}
            required
          />
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
              placeholder="Add any additional notes for this reminder..."
              value={newReminder.notes}
              onChange={e => setNewReminder({...newReminder, notes: e.target.value})}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
