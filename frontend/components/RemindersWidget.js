import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Button, Badge } from "./ui";
import api from "../lib/api";

export default function RemindersWidget({ maxItems = 5 }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReminders();
  }, []);

  async function loadReminders() {
    try {
      const apps = await api.getApplicationsWithStages();
      
      // Extract upcoming scheduled stages
      const upcomingReminders = [];
      const now = new Date();
      
      for (const app of apps) {
        if (app.stages && app.stages.length > 0) {
          const scheduledStages = app.stages.filter(stage => 
            stage.scheduled_at && new Date(stage.scheduled_at) >= now
          );
          scheduledStages.forEach(stage => {
            upcomingReminders.push({
              ...stage,
              application: app,
              job: app.job
            });
          });
        }
      }
      
      // Sort by scheduled date and take only the next few
      upcomingReminders.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
      setReminders(upcomingReminders.slice(0, maxItems));
    } catch (err) {
      console.error("Failed to load reminders:", err);
    } finally {
      setLoading(false);
    }
  }

  function getTimeUntil(dateString) {
    const now = new Date();
    const target = new Date(dateString);
    const diffMs = target - now;
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    return "soon";
  }

  function getReminderTypeColor(name) {
    const type = name.toLowerCase();
    if (type.includes('interview')) return 'bg-blue-100 text-blue-800';
    if (type.includes('follow')) return 'bg-green-100 text-green-800';
    if (type.includes('deadline')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  }

  if (loading) {
    return (
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">🗓️ Upcoming Reminders</h3>
          </div>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">🗓️ Upcoming Reminders</h3>
          <Link href="/reminders">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>
        
        {reminders.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-sm">No upcoming reminders</p>
            <Link href="/reminders">
              <Button variant="outline" size="sm" className="mt-2">
                Create Reminder
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map(reminder => (
              <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <Badge size="sm" className={getReminderTypeColor(reminder.name)}>
                      {reminder.name}
                    </Badge>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {reminder.job?.company_name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {reminder.job?.title}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(reminder.scheduled_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getTimeUntil(reminder.scheduled_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {reminders.length > 0 && (
          <div className="border-t pt-3">
            <Link href="/reminders">
              <Button variant="outline" size="sm" className="w-full">
                📅 View All Reminders
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
