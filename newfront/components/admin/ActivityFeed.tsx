import { motion } from "motion/react";
import { Activity } from "../../features/admin/api";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import {
  User,
  FileText,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

interface ActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
}

const activityIcons: Record<string, LucideIcon> = {
  user: User,
  document: FileText,
  settings: Settings,
  error: AlertCircle,
  success: CheckCircle,
  warning: XCircle,
};

const activityColors: Record<string, string> = {
  user: "#9F5F80",
  document: "#3b82f6",
  settings: "#8b5cf6",
  error: "#ef4444",
  success: "#10b981",
  warning: "#f59e0b",
};

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  const { language } = useLanguage();

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-lg animate-pulse"
            style={{ backgroundColor: "rgba(90, 94, 106, 0.3)" }}
          />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div
        className="text-center py-12 rounded-xl"
        style={{
          backgroundColor: "rgba(90, 94, 106, 0.2)",
          color: "rgba(182, 186, 197, 0.7)",
        }}
      >
        {language === "he" ? "אין פעילות אחרונה" : "No recent activity"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => {
        const Icon = activityIcons[activity.type] || AlertCircle;
        const color = activityColors[activity.type] || "#9F5F80";

        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 rounded-lg backdrop-blur-xl flex items-start gap-4"
            style={{
              backgroundColor: "rgba(90, 94, 106, 0.3)",
              border: "1px solid rgba(159, 95, 128, 0.1)",
            }}
          >
            <div
              className="p-2 rounded-lg shrink-0"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div style={{ color: "#b6bac5" }} className="text-sm">
                  {activity.user}
                </div>
                <div
                  className="text-xs shrink-0"
                  style={{ color: "rgba(182, 186, 197, 0.6)" }}
                >
                  {formatDistanceToNow(new Date(activity.timestamp), {
                    addSuffix: true,
                    locale: language === "he" ? he : undefined,
                  })}
                </div>
              </div>
              <div
                className="text-sm"
                style={{ color: "rgba(182, 186, 197, 0.8)" }}
              >
                {activity.description}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
