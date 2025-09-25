import { useMemo } from "react";
import Link from "next/link";
import useRemindersData from "../hooks/useRemindersData";
import { getTimeUntil } from "../utils/date";
import { getReminderTypeColor } from "../utils/reminders";
import { Card, Button, Badge } from "../../../components/ui";

export default function RemindersWidget({ maxItems = 5 }) {
  const { loading, reminders, applications } = useRemindersData();

  const upcoming = useMemo(() => {
    const now = new Date();
    return (reminders || [])
      .filter((r) => new Date(r.scheduled_at) >= now)
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
      .slice(0, maxItems);
  }, [reminders, maxItems]);

  if (loading) {
    return (
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">🗓️ Upcoming Reminders</h3>
          </div>
          <div className="animate-pulse space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 rounded" />)}
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
          <Link href="/reminders"><Button variant="outline" size="sm">View All</Button></Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-sm">No upcoming reminders</p>
            <Link href="/reminders">
              <Button variant="outline" size="sm" className="mt-2">Create Reminder</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((r) => {
              const app = applications.find(a => String(a.id) === String(r.application_id));
              return (
                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge size="sm" className={getReminderTypeColor(r.name)}>{r.name}</Badge>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {app?.job?.company_name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{app?.job?.title}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(r.scheduled_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs text-gray-500">{getTimeUntil(r.scheduled_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="border-t pt-3">
            <Link href="/reminders">
              <Button variant="outline" size="sm" className="w-full">📅 View All Reminders</Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
