import { Card } from "../../../components/ui";
import { ListSkeleton } from "../../../components/SkeletonLoader";
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
    return <ListSkeleton count={5} />;
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
          onToggle={() => toggleJobExpanded(job.id)}
          onView={() => onOpenDetails(job)}
          onApply={() => onOpenApply(job)}
          onDelete={() => onDelete(job.id)}
        />
      ))}
    </div>
  );
}
