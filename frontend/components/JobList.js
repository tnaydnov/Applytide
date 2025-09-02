import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Card, Button, Badge } from './ui';

export default function JobList({ user, userProfile, filters = {} }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date'); // 'date', 'salary', 'title'
  const [error, setError] = useState(null);

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all jobs from the database
      let jobsData;
      try {
        jobsData = await api.listJobs();
        console.log('Loaded jobs:', jobsData);
      } catch (jobsError) {
        console.log('Failed to load jobs:', jobsError);
        setError('Failed to load jobs. Please check your connection and try again.');
        return;
      }
      
      // Handle different response formats
      const jobsList = jobsData?.jobs || jobsData?.data || jobsData || [];
      
      if (jobsList.length === 0) {
        console.log('No jobs found in database');
        setError('No jobs found. Add some jobs to get started!');
        setJobs([]);
        return;
      }
      
      // Filter jobs based on user preferences if available
      let filteredJobs = jobsList;
      if (userProfile && userProfile.location) {
        filteredJobs = filterJobsByLocation(jobsList, userProfile.location);
      }
      
      setJobs(filteredJobs);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      setError('Failed to load jobs. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  const filterJobsByLocation = (jobsList, userLocation) => {
    const userLocationLower = userLocation.toLowerCase();
    
    return jobsList.filter(job => {
      const jobLocation = (job.location || '').toLowerCase();
      const jobTitle = (job.title || '').toLowerCase();
      const jobCompany = (job.company_name || '').toLowerCase();
      
      // Show remote jobs to everyone
      if (jobLocation.includes('remote')) {
        return true;
      }
      
      // Show jobs in user's location
      if (jobLocation.includes(userLocationLower)) {
        return true;
      }
      
      // If user location is Israel, show jobs in major Israeli cities
      if (userLocationLower.includes('israel')) {
        const israelCities = ['tel aviv', 'jerusalem', 'haifa', 'herzliya', 'ramat gan', 'netanya', 'petah tikva'];
        return israelCities.some(city => jobLocation.includes(city));
      }
      
      return false;
    });
  };

  const sortJobs = (jobsList) => {
    return [...jobsList].sort((a, b) => {
      switch (sortBy) {
        case 'salary':
          const salaryA = parseInt(a.salary_max || a.salary_min || '0');
          const salaryB = parseInt(b.salary_max || b.salary_min || '0');
          return salaryB - salaryA;
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'date':
        default:
          const dateA = new Date(a.created_at || a.posted_date || 0);
          const dateB = new Date(b.created_at || b.posted_date || 0);
          return dateB - dateA;
      }
    });
  };

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const sortedJobs = sortJobs(jobs);

  const formatSalary = (job) => {
    if (job.salary_min && job.salary_max) {
      return `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`;
    } else if (job.salary_min) {
      return `$${job.salary_min.toLocaleString()}+`;
    } else if (job.salary_max) {
      return `Up to $${job.salary_max.toLocaleString()}`;
    }
    return 'Salary not specified';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getJobTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'full-time':
        return 'bg-green-100 text-green-800';
      case 'part-time':
        return 'bg-blue-100 text-blue-800';
      case 'contract':
        return 'bg-yellow-100 text-yellow-800';
      case 'remote':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading jobs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-800 mb-2">Unable to Load Jobs</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button 
            onClick={loadJobs}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Available Jobs</h2>
          <p className="text-gray-600">Find your next opportunity ({jobs.length} jobs)</p>
        </div>
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Sort Options */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="date">Date Posted</option>
              <option value="salary">Salary</option>
              <option value="title">Job Title</option>
            </select>
          </div>
          
          <Button 
            onClick={loadJobs}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
          >
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Job Cards */}
      {sortedJobs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6.5" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Jobs Available</h3>
          <p className="text-gray-600">Check back later for new opportunities or adjust your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-lg transition-shadow duration-200">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start space-y-4 sm:space-y-0">
                  {/* Job Info */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                      {job.job_type && (
                        <Badge className={getJobTypeColor(job.job_type)}>
                          {job.job_type}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-gray-600 space-y-1">
                      <p className="font-medium">{job.company_name}</p>
                      <p className="text-sm">📍 {job.location || 'Location not specified'}</p>
                      <p className="text-sm">💰 {formatSalary(job)}</p>
                      <p className="text-sm">📅 Posted: {formatDate(job.created_at || job.posted_date)}</p>
                    </div>
                    
                    {job.description && (
                      <p className="text-gray-600 text-sm mt-3 line-clamp-2">
                        {job.description.length > 150 
                          ? `${job.description.substring(0, 150)}...`
                          : job.description
                        }
                      </p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col space-y-2 sm:ml-6">
                    <Button 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap"
                      onClick={() => {
                        if (job.url) {
                          window.open(job.url, '_blank');
                        } else {
                          alert('Job application URL not available');
                        }
                      }}
                    >
                      Apply Now
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className="text-gray-600 border-gray-300 hover:bg-gray-50 whitespace-nowrap"
                      onClick={() => {
                        // TODO: Implement save job functionality
                        alert('Save job functionality coming soon!');
                      }}
                    >
                      💾 Save
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
