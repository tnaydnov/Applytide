/**
 * ActivePipeline Component
 * Displays recent applications with status and click to navigate
 */

import { motion } from "motion/react";
import { Briefcase, ChevronRight, Clock } from "lucide-react";
import { EmptyState } from "../../../components/shared/EmptyState";
import type { ApplicationCard } from "../../../features/dashboard/api";

interface ActivePipelineProps {
  applications: ApplicationCard[];
  onNavigate: (path: string) => void;
  isRTL?: boolean;
}

const getStatusColor = (status: string): string => {
  const statusLower = status.toLowerCase();

  if (statusLower.includes("reject")) {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  }
  if (
    statusLower.includes("offer") ||
    statusLower.includes("accept")
  ) {
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  }
  if (
    statusLower.includes("interview") ||
    statusLower.includes("screen")
  ) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  }
  if (statusLower.includes("applied")) {
    return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
  }

  return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
};

const formatDate = (
  dateString: string,
  isRTL: boolean,
): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return isRTL ? "היום" : "Today";
  if (diffDays === 1) return isRTL ? "אתמול" : "Yesterday";
  if (diffDays < 7)
    return isRTL
      ? `לפני ${diffDays} ימים`
      : `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return isRTL
      ? `לפני ${weeks} שבועות`
      : `${weeks} weeks ago`;
  }

  const months = Math.floor(diffDays / 30);
  return isRTL
    ? `לפני ${months} חודשים`
    : `${months} months ago`;
};

export function ActivePipeline({
  applications,
  onNavigate,
  isRTL = false,
}: ActivePipelineProps) {
  return (
    <div className="mb-8">
      {/* Header */}
      <div
        className="flex items-center justify-between mb-6"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-[#9F5F80]" />
          <h2 className="text-xl font-bold text-[#383e4e] dark:text-white">
            {isRTL ? "מועמדויות בתהליך" : "Active Pipeline"}
          </h2>
        </div>

        <button
          onClick={() => onNavigate("/applications")}
          className="text-sm text-[#9F5F80] hover:text-[#383e4e] dark:hover:text-white font-medium flex items-center gap-1 transition-colors"
        >
          {isRTL ? "הצג הכל" : "View all"}
          <ChevronRight
            className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Applications List */}
      {applications.length > 0 ? (
        <div className="space-y-4">
          {applications.map((app, idx) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
              onClick={() =>
                onNavigate(`/applications?app=${app.id}`)
              }
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(`/applications?app=${app.id}`); } }}
              role="button"
              tabIndex={0}
              className="
                bg-white dark:bg-[#383e4e]/50 
                border border-[#b6bac5]/20 
                rounded-xl p-5 
                hover:border-[#9F5F80]/50 
                hover:shadow-lg
                transition-all duration-200
                cursor-pointer group
              "
              dir={isRTL ? "rtl" : "ltr"}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Job Title */}
                  <h3 className="font-semibold text-[#383e4e] dark:text-white mb-1 group-hover:text-[#9F5F80] transition-colors truncate">
                    {app.job_title}
                  </h3>

                  {/* Company Name */}
                  <p className="text-sm text-[#6c757d] dark:text-[#b6bac5] mb-3">
                    {app.company_name}
                  </p>

                  {/* Status + Time */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}
                    >
                      {app.status}
                    </span>
                    <span className="text-xs text-[#6c757d] dark:text-[#b6bac5] flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(app.created_at, isRTL)}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight
                  className={`
                    h-6 w-6 text-[#b6bac5] flex-shrink-0
                    group-hover:text-[#9F5F80] 
                    transition-all duration-200
                    ${isRTL ? "group-hover:-translate-x-1 rotate-180" : "group-hover:translate-x-1"}
                  `}
                />
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          emoji="📊"
          title={
            isRTL
              ? "אין מועמדויות עדיין"
              : "No applications yet"
          }
          description={
            isRTL
              ? "התחילו לעקוב אחר בקשות עבודה והן יופיעו כאן"
              : "Start applying to jobs and they'll show up here"
          }
          action={{
            label: isRTL ? "עקבו אחר משרות" : "Track Jobs",
            onClick: () => onNavigate("/job-search"),
          }}
        />
      )}
    </div>
  );
}

export default ActivePipeline;