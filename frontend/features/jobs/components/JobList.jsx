import { Card } from "../../../components/ui";
import JobCard from "./JobCard";

export default function JobList({
  jobs,
  loading,
  expandedJobs,
  toggleJobExpanded,
  onOpenDetails,
  onOpenApply,
  onDelete
}) {
  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="flex justify-between items-start space-x-4">
              <div className="flex-1 space-y-3">
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-4/6"></div>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
              </div>
              <div className="flex-shrink-0">
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!jobs?.length) {
    return (
      <Card className="text-center py-12">
        <div className="space-y-4">
          <div className="text-6xl">📋</div>
          <h3 className="text-xl font-semibold text-slate-100 dark:text-gray-100">No jobs found</h3>
          <p className="text-slate-300 dark:text-gray-400">
            Start by adding your first job or adjust your filters.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {jobs.map((job, index) => (
        <JobCard
          key={job.id}
          job={job}
          index={index}
          isExpanded={expandedJobs?.has(job.id)}
          onToggleExpanded={() => toggleJobExpanded(job.id)}
          onOpenDetails={() => onOpenDetails(job)}
          onOpenApply={() => onOpenApply(job)}
          onDelete={() => onDelete(job.id)}
        />
      ))}
    </div>
  );
}
