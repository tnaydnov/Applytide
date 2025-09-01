import { useEffect, useRef, useState } from "react";
import { api, connectWS } from "../lib/api";
import Link from "next/link";
import { Button, Card, Badge, Input } from "../components/ui";
import { useToast } from '../lib/toast';

const STATUSES = ["Saved", "Applied", "Phone Screen", "Tech", "On-site", "Offer", "Accepted", "Rejected"];

const statusConfig = {
  "Saved": { color: "bg-gray-100 text-gray-800", icon: "💾", gradient: "from-gray-50 to-gray-100", bgColor: "bg-gray-50" },
  "Applied": { color: "bg-blue-100 text-blue-800", icon: "📨", gradient: "from-blue-50 to-blue-100", bgColor: "bg-blue-50" },
  "Phone Screen": { color: "bg-yellow-100 text-yellow-800", icon: "📞", gradient: "from-yellow-50 to-yellow-100", bgColor: "bg-yellow-50" },
  "Tech": { color: "bg-purple-100 text-purple-800", icon: "💻", gradient: "from-purple-50 to-purple-100", bgColor: "bg-purple-50" },
  "On-site": { color: "bg-indigo-100 text-indigo-800", icon: "🏢", gradient: "from-indigo-50 to-indigo-100", bgColor: "bg-indigo-50" },
  "Offer": { color: "bg-green-100 text-green-800", icon: "🎉", gradient: "from-green-50 to-green-100", bgColor: "bg-green-50" },
  "Accepted": { color: "bg-emerald-100 text-emerald-800", icon: "✅", gradient: "from-emerald-50 to-emerald-100", bgColor: "bg-emerald-50" },
  "Rejected": { color: "bg-red-100 text-red-800", icon: "❌", gradient: "from-red-50 to-red-100", bgColor: "bg-red-50" }
};

function ApplicationCard({ application, onMove, statuses, onDragStart, onDragEnd }) {
  const [showActions, setShowActions] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const config = statusConfig[application.status] || statusConfig["Saved"];

  const availableStatuses = statuses.filter(s => s !== application.status);

  const handleDragStart = (e) => {
    console.log('🚀 DRAG START EVENT FIRED!', application.id, application.job.title);
    console.log('Event type:', e.type, 'Target:', e.target.tagName);
    console.log('DataTransfer available:', !!e.dataTransfer);
    
    setIsDragging(true);
    
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify({
        id: application.id,
        currentStatus: application.status
      }));
      e.dataTransfer.effectAllowed = 'move';
      console.log('✅ Drag data set successfully');
    } catch (error) {
      console.error('❌ Error setting drag data:', error);
    }
    
    onDragStart && onDragStart(application);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd && onDragEnd();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  };

  return (
    <Card 
      className={`group transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-slideIn ${
        isDragging ? 'opacity-50 rotate-2 scale-105 shadow-2xl' : ''
      }`}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      padding={false}
    >
      <div className="p-3 sm:p-4 space-y-3">
        {/* Drag Handle */}
        <div className="flex items-center justify-between relative">
          <div 
            className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing p-2 -m-2 hover:bg-gray-100 rounded transition-all" 
            title="Drag to move or click for menu"
            draggable="true"
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onMouseDown={(e) => {
              console.log('🎯 Drag handle mousedown!');
            }}
            onClick={(e) => {
              console.log('🖱️ Opening move menu');
              e.stopPropagation();
              setShowMoveMenu(!showMoveMenu);
            }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
            </svg>
          </div>
          
          {/* Move Menu */}
          {showMoveMenu && (
            <div className="absolute top-8 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 min-w-[150px]">
              <div className="text-xs font-medium text-gray-700 mb-2">Move to:</div>
              {availableStatuses.map(status => (
                <button
                  key={status}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center space-x-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(application.id, status);
                    setShowMoveMenu(false);
                  }}
                >
                  <span>{statusConfig[status]?.icon || '📋'}</span>
                  <span>{status}</span>
                </button>
              ))}
              <button
                className="block w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded mt-1 border-t border-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoveMenu(false);
                }}
              >
                Cancel
              </button>
            </div>
          )}
          
          <div className="ml-2 flex-shrink-0">
            <Badge variant="default" size="sm">
              <span className="mr-1">{config.icon}</span>
              <span className="hidden sm:inline">{application.status}</span>
            </Badge>
          </div>
        </div>
        
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors text-sm sm:text-base">
              {application.job.title}
            </h4>
            {application.job.company_name && (
              <p className="text-xs sm:text-sm text-indigo-600 font-medium mt-1">
                {application.job.company_name}
              </p>
            )}
            {application.job.location && (
              <p className="text-xs text-gray-500 mt-1 flex items-center">
                <span className="mr-1">📍</span>
                <span className="truncate">{application.job.location}</span>
              </p>
            )}
          </div>
        </div>

        {/* Application Metadata */}
        <div className="space-y-1">
          {application.created_at && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center">
                <span className="mr-1">📅</span>
                Applied {formatDate(application.created_at)}
              </span>
              <span className="text-gray-400">
                {getDaysAgo(application.created_at)}
              </span>
            </div>
          )}
          
          {application.job.salary_min && application.job.salary_max && (
            <div className="text-xs text-green-600 font-medium">
              💰 ${application.job.salary_min.toLocaleString()} - ${application.job.salary_max.toLocaleString()}
            </div>
          )}
          
          {application.notes_count > 0 && (
            <div className="text-xs text-gray-500">
              📝 {application.notes_count} note{application.notes_count !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {application.job.source_url && (
          <a 
            href={application.job.source_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-indigo-600 transition-colors inline-flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mr-1">🔗</span>
            View Original
          </a>
        )}

        {/* Priority Indicator */}
        {application.priority && (
          <div className="flex items-center text-xs">
            <span className="mr-1">
              {application.priority === 'high' ? '🔥' : application.priority === 'medium' ? '⭐' : '📌'}
            </span>
            <span className={`capitalize ${
              application.priority === 'high' ? 'text-red-600' : 
              application.priority === 'medium' ? 'text-yellow-600' : 'text-gray-600'
            }`}>
              {application.priority} priority
            </span>
          </div>
        )}

        <div className={`transition-all duration-300 ${showActions ? 'opacity-100 max-h-32' : 'opacity-0 max-h-0'} overflow-hidden`}>
          <div className="flex flex-wrap gap-1 sm:gap-2 pt-2 border-t border-gray-100">
            <Link href={`/applications/${application.id}`}>
              <Button size="sm" variant="outline" className="text-xs">
                <span className="mr-1">👁️</span>
                <span className="hidden sm:inline">View</span>
              </Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-green-600 hover:text-green-700"
              onClick={(e) => {
                e.stopPropagation();
                // Add note functionality - placeholder for now
                alert('Add note feature coming soon!');
              }}
            >
              <span className="mr-1">📝</span>
              <span className="hidden sm:inline">Note</span>
            </Button>
            {availableStatuses.slice(0, 1).map(status => (
              <Button
                key={status}
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(application.id, status);
                }}
              >
                <span className="mr-1">{statusConfig[status].icon}</span>
                <span className="hidden sm:inline">{status}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Column({ status, items, onMove, availableStatuses, draggedItem, onDragStart, onDragEnd }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDropAllowed, setIsDropAllowed] = useState(false);
  const config = statusConfig[status];
  
  // Ensure items is always an array
  const safeItems = Array.isArray(items) ? items : [];
  
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 Drag enter column:', status);
    setIsDragOver(true);
    setIsDropAllowed(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 Drag over column:', status);
    
    // Always allow drop - we'll check validity on drop
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
    setIsDropAllowed(true);
  };

  const handleDragLeave = (e) => {
    // Only reset if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
      setIsDropAllowed(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    setIsDropAllowed(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.currentStatus !== status) {
        onMove(data.id, status);
      }
    } catch (error) {
      console.error('Drop failed:', error);
    }
  };

  const getColumnStats = () => {
    const totalSalary = safeItems.reduce((sum, item) => {
      const min = item.job?.salary_min || 0;
      const max = item.job?.salary_max || 0;
      return sum + ((min + max) / 2);
    }, 0);
    
    const avgSalary = safeItems.length > 0 ? Math.round(totalSalary / safeItems.length) : 0;
    
    return {
      count: safeItems.length,
      avgSalary: avgSalary > 0 ? avgSalary : null,
      highPriority: safeItems.filter(item => item.priority === 'high').length
    };
  };

  const stats = getColumnStats();
  
  return (
    <div className="flex-shrink-0 w-72 sm:w-80">
      <div 
        className={`bg-gradient-to-br ${config.gradient} rounded-xl border-2 transition-all duration-300 overflow-hidden ${
          isDragOver 
            ? isDropAllowed 
              ? 'border-green-400 shadow-lg scale-105 bg-green-50' 
              : 'border-red-400 shadow-lg bg-red-50'
            : 'border-gray-200'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Column Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-lg sm:text-xl">{config.icon}</span>
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{status}</h3>
            </div>
            <Badge variant="default" size="sm">
              {stats.count}
            </Badge>
          </div>
          
          {/* Column Stats */}
          {stats.count > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0 text-xs text-gray-600">
              {stats.avgSalary && (
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                  💰 ${stats.avgSalary.toLocaleString()}
                </span>
              )}
              {stats.highPriority > 0 && (
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                  🔥 {stats.highPriority}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Drop Zone Indicator */}
        {isDragOver && (
          <div className={`p-4 text-center border-2 border-dashed ${
            isDropAllowed 
              ? 'border-green-400 bg-green-50 text-green-700' 
              : 'border-red-400 bg-red-50 text-red-700'
          }`}>
            <div className="text-2xl mb-2">
              {isDropAllowed ? '⬇️' : '❌'}
            </div>
            <p className="text-sm font-medium">
              {isDropAllowed 
                ? `Drop to move to ${status}` 
                : 'Cannot drop here'
              }
            </p>
          </div>
        )}

        {/* Column Content */}
        <div className="p-4 space-y-3 min-h-[200px] max-h-[600px] overflow-y-auto">
          {safeItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-3xl mb-2">{config.icon}</div>
              <p className="text-sm">No applications yet</p>
              <p className="text-xs text-gray-400 mt-1">Drag applications here</p>
            </div>
          ) : (
            safeItems.map((app, index) => (
              <div key={app.id} style={{ animationDelay: `${index * 100}ms` }}>
                <ApplicationCard 
                  application={app} 
                  onMove={onMove}
                  statuses={availableStatuses}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [columns, setColumns] = useState({});
  const [filteredColumns, setFilteredColumns] = useState({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [draggedItem, setDraggedItem] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const wsRef = useRef(null);
  const toast = useToast();

  // Filter and search applications
  useEffect(() => {
    const filtered = {};
    
    STATUSES.forEach(status => {
      const items = columns[status] || [];
      
      let filteredItems = items.filter(app => {
        const matchesSearch = !searchTerm || 
          app.job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.job.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.job.location?.toLowerCase().includes(searchTerm.toLowerCase());
          
        const matchesFilter = selectedFilter === 'all' ||
          (selectedFilter === 'high-priority' && app.priority === 'high') ||
          (selectedFilter === 'recent' && new Date(app.created_at) > new Date(Date.now() - 7*24*60*60*1000)) ||
          (selectedFilter === 'with-salary' && app.job.salary_min && app.job.salary_max);
          
        return matchesSearch && matchesFilter;
      });
      
      // Sort applications
      filteredItems.sort((a, b) => {
        switch (sortBy) {
          case 'recent':
            return new Date(b.created_at) - new Date(a.created_at);
          case 'salary':
            const aSalary = (a.job.salary_min + a.job.salary_max) / 2 || 0;
            const bSalary = (b.job.salary_min + b.job.salary_max) / 2 || 0;
            return bSalary - aSalary;
          case 'company':
            return (a.job.company_name || '').localeCompare(b.job.company_name || '');
          case 'priority':
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          default:
            return 0;
        }
      });
      
      filtered[status] = filteredItems;
    });
    
    setFilteredColumns(filtered);
  }, [columns, searchTerm, selectedFilter, sortBy]);

  async function load() {
    setLoading(true);
    try {
      const result = {};
      const promises = STATUSES.map(async (status) => {
        try {
          const data = await api.listCardsByStatus(status);
          // Ensure we always get an array
          result[status] = Array.isArray(data) ? data : [];
        } catch (err) {
          console.warn(`Failed to load cards for status ${status}:`, err);
          result[status] = [];
        }
      });
      await Promise.all(promises);
      setColumns(result);
      
      // Calculate enhanced stats
      const allApps = Object.values(result).flat();
      const totalApps = allApps.length;
      const activeApps = result["Applied"]?.length + result["Phone Screen"]?.length + result["Tech"]?.length + result["On-site"]?.length || 0;
      const offers = result["Offer"]?.length + result["Accepted"]?.length || 0;
      const rejections = result["Rejected"]?.length || 0;
      const successRate = totalApps > 0 ? Math.round((offers / totalApps) * 100) : 0;
      
      // Advanced analytics
      const avgSalary = allApps.reduce((sum, app) => {
        const min = app.job?.salary_min || 0;
        const max = app.job?.salary_max || 0;
        return sum + ((min + max) / 2);
      }, 0) / (allApps.filter(app => app.job?.salary_min && app.job?.salary_max).length || 1);
      
      const recentApps = allApps.filter(app => 
        new Date(app.created_at) > new Date(Date.now() - 7*24*60*60*1000)
      ).length;
      
      const conversionRate = result["Applied"]?.length > 0 ? 
        Math.round((activeApps / result["Applied"].length) * 100) : 0;
      
      const topCompanies = allApps.reduce((acc, app) => {
        const company = app.job?.company_name;
        if (company) {
          acc[company] = (acc[company] || 0) + 1;
        }
        return acc;
      }, {});
      
      setStats({ 
        totalApps, 
        activeApps, 
        offers, 
        rejections,
        successRate, 
        avgSalary: Math.round(avgSalary),
        recentApps,
        conversionRate,
        topCompanies: Object.entries(topCompanies)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
      });
    } catch (err) {
      toast.error("Failed to load pipeline data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // live updates
    wsRef.current = connectWS((evt) => {
      if (["stage_changed", "stage_added", "note_added"].includes(evt.type)) {
        load();
        toast.success("Pipeline updated!");
      }
    });
    return () => wsRef.current && wsRef.current.close();
  }, []);

  const handleDragStart = (application) => {
    setDraggedItem(application);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  async function move(id, status) {
    try {
      await api.moveApp(id, status);
      await load();
      toast.success(`Application moved to ${status}`);
    } catch (err) {
      toast.error("Failed to move application");
    }
  }

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedFilter('all');
    setSortBy('recent');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 text-lg">Loading your pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Enhanced Controls */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Application Pipeline</h1>
            <p className="text-gray-600 mt-1">Track your job applications across all stages</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="text-purple-600 border-purple-600 hover:bg-purple-50"
            >
              <span className="mr-2">📊</span>
              {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
            </Button>
            <Link href="/jobs">
              <Button>
                <span className="mr-2">➕</span>
                Add Job
              </Button>
            </Link>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <Card>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 gap-4">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Input
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
              </div>
              
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Applications</option>
                <option value="recent">Recent (7 days)</option>
                <option value="high-priority">High Priority</option>
                <option value="with-salary">With Salary Info</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="recent">Sort by Date</option>
                <option value="salary">Sort by Salary</option>
                <option value="company">Sort by Company</option>
                <option value="priority">Sort by Priority</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>
                Showing {Object.values(filteredColumns).flat().length} of {stats.totalApps} applications
              </span>
              {(searchTerm || selectedFilter !== 'all' || sortBy !== 'recent') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-xs text-gray-500"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="text-center">
            <div className="text-2xl font-bold text-indigo-600 mb-1">
              {stats.totalApps}
            </div>
            <div className="text-sm text-gray-600">Total Applications</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-yellow-600 mb-1">
              {stats.activeApps}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {stats.offers}
            </div>
            <div className="text-sm text-gray-600">Offers</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-red-600 mb-1">
              {stats.rejections}
            </div>
            <div className="text-sm text-gray-600">Rejections</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {stats.successRate}%
            </div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {stats.recentApps}
            </div>
            <div className="text-sm text-gray-600">This Week</div>
          </Card>
        </div>

        {/* Advanced Analytics Panel */}
        {showAnalytics && (
          <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">📈 Performance Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Conversion Rate:</span>
                    <span className="font-medium text-green-600">{stats.conversionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Salary:</span>
                    <span className="font-medium text-blue-600">
                      {stats.avgSalary > 0 ? `$${stats.avgSalary.toLocaleString()}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pipeline Health:</span>
                    <span className={`font-medium ${stats.activeApps > stats.rejections ? 'text-green-600' : 'text-yellow-600'}`}>
                      {stats.activeApps > stats.rejections ? 'Healthy' : 'Needs Attention'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">🏢 Top Companies</h4>
                <div className="space-y-1 text-sm">
                  {stats.topCompanies?.slice(0, 4).map(([company, count]) => (
                    <div key={company} className="flex justify-between">
                      <span className="truncate">{company}</span>
                      <span className="font-medium text-indigo-600">{count}</span>
                    </div>
                  ))}
                  {(!stats.topCompanies || stats.topCompanies.length === 0) && (
                    <p className="text-gray-500 italic">No companies yet</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">💡 Insights</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  {stats.recentApps === 0 && (
                    <p>• Consider applying to more positions this week</p>
                  )}
                  {stats.successRate < 10 && stats.totalApps > 5 && (
                    <p>• Review your application strategy</p>
                  )}
                  {stats.activeApps === 0 && stats.totalApps > 0 && (
                    <p>• Follow up on pending applications</p>
                  )}
                  {stats.avgSalary === 0 && (
                    <p>• Add salary information to track compensation</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Enhanced Kanban Board - Mobile Responsive */}
      <div className="overflow-x-auto pb-4">
        <div className="flex space-x-4 lg:space-x-6 min-w-max lg:min-w-0">
          {STATUSES.map(status => (
            <Column 
              key={status} 
              status={status} 
              items={filteredColumns[status] || []} 
              onMove={move}
              availableStatuses={STATUSES}
              draggedItem={draggedItem}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      </div>

      {/* Enhanced Empty State */}
      {Object.values(filteredColumns).flat().length === 0 && !loading && (
        <Card className="text-center py-16">
          <div className="space-y-6">
            <div className="text-6xl">🚀</div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                {searchTerm || selectedFilter !== 'all' ? 'No matching applications' : 'Start Your Job Hunt!'}
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {searchTerm || selectedFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria to find applications.'
                  : 'Add your first job to begin tracking your application progress through our beautiful pipeline.'
                }
              </p>
            </div>
            {(!searchTerm && selectedFilter === 'all') ? (
              <Link href="/jobs">
                <Button size="lg">
                  <span className="mr-2">✨</span>
                  Add Your First Job
                </Button>
              </Link>
            ) : (
              <Button size="lg" onClick={clearFilters} variant="outline">
                <span className="mr-2">🔄</span>
                Clear Filters
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Drag Instructions */}
      {stats.totalApps > 0 && !loading && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center space-x-3 text-blue-800">
            <span className="text-2xl">💡</span>
            <div>
              <h4 className="font-medium">Pro Tip</h4>
              <p className="text-sm text-blue-700">
                Drag and drop applications between columns to update their status instantly. 
                Use search and filters to find specific applications quickly.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
