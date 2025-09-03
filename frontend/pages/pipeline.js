import { useEffect, useRef, useState } from "react";
import { api, connectWS } from "../lib/api";
import Link from "next/link";
import { Button, Card, Badge, Input } from "../components/ui";
import { useToast } from '../lib/toast';

// Available pipeline stages that can be added to applications
const AVAILABLE_STAGES = [
  { id: 'saved', name: 'Saved', icon: '💾', category: 'initial' },
  { id: 'applied', name: 'Applied', icon: '📨', category: 'initial' },
  { id: 'phone-screen', name: 'Phone Screen', icon: '📞', category: 'interview' },
  { id: 'hr-round', name: 'HR Round', icon: '👥', category: 'interview' },
  { id: 'tech-1', name: 'Tech Interview 1', icon: '💻', category: 'interview' },
  { id: 'tech-2', name: 'Tech Interview 2', icon: '🔧', category: 'interview' },
  { id: 'system-design', name: 'System Design', icon: '🏗️', category: 'interview' },
  { id: 'coding-challenge', name: 'Coding Challenge', icon: '⌨️', category: 'interview' },
  { id: 'take-home', name: 'Take Home Assignment', icon: '🏠', category: 'interview' },
  { id: 'case-study', name: 'Case Study', icon: '📊', category: 'interview' },
  { id: 'presentation', name: 'Presentation', icon: '📽️', category: 'interview' },
  { id: 'culture-fit', name: 'Culture Fit', icon: '🌱', category: 'interview' },
  { id: 'team-match', name: 'Team Match', icon: '🤝', category: 'interview' },
  { id: 'founder-chat', name: 'Founder Chat', icon: '👔', category: 'interview' },
  { id: 'bar-raiser', name: 'Bar Raiser', icon: '⭐', category: 'interview' },
  { id: 'partner-interview', name: 'Partner Interview', icon: '🤵', category: 'interview' },
  { id: 'final-round', name: 'Final Round', icon: '🎯', category: 'interview' },
  { id: 'on-site', name: 'On-site', icon: '🏢', category: 'interview' },
  { id: 'reference-check', name: 'Reference Check', icon: '📋', category: 'verification' },
  { id: 'background-check', name: 'Background Check', icon: '🔍', category: 'verification' },
  { id: 'offer', name: 'Offer', icon: '🎉', category: 'final' },
  { id: 'negotiation', name: 'Negotiation', icon: '💼', category: 'final' },
  { id: 'accepted', name: 'Accepted', icon: '✅', category: 'final' },
  { id: 'rejected', name: 'Rejected', icon: '❌', category: 'final' },
  { id: 'withdrawn', name: 'Withdrawn', icon: '🚫', category: 'final' }
];

// Default pipeline stages 
const DEFAULT_STAGES = ['Saved', 'Applied', 'Phone Screen', 'Tech', 'On-site', 'Offer', 'Accepted', 'Rejected'];

const statusConfig = {
  "Saved": { color: "bg-gray-100 text-gray-800", icon: "💾", gradient: "from-gray-50 to-gray-100", bgColor: "bg-gray-500" },
  "Applied": { color: "bg-blue-100 text-blue-800", icon: "📨", gradient: "from-blue-50 to-blue-100", bgColor: "bg-blue-500" },
  "Phone Screen": { color: "bg-yellow-100 text-yellow-800", icon: "📞", gradient: "from-yellow-50 to-yellow-100", bgColor: "bg-yellow-500" },
  "HR Round": { color: "bg-cyan-100 text-cyan-800", icon: "👥", gradient: "from-cyan-50 to-cyan-100", bgColor: "bg-cyan-50" },
  "Tech": { color: "bg-purple-100 text-purple-800", icon: "💻", gradient: "from-purple-50 to-purple-100", bgColor: "bg-purple-500" },
  "Tech Interview 1": { color: "bg-purple-100 text-purple-800", icon: "💻", gradient: "from-purple-50 to-purple-100", bgColor: "bg-purple-50" },
  "Tech Interview 2": { color: "bg-purple-100 text-purple-800", icon: "🔧", gradient: "from-purple-50 to-purple-100", bgColor: "bg-purple-50" },
  "System Design": { color: "bg-indigo-100 text-indigo-800", icon: "🏗️", gradient: "from-indigo-50 to-indigo-100", bgColor: "bg-indigo-50" },
  "Coding Challenge": { color: "bg-green-100 text-green-800", icon: "⌨️", gradient: "from-green-50 to-green-100", bgColor: "bg-green-50" },
  "Take Home Assignment": { color: "bg-blue-100 text-blue-800", icon: "🏠", gradient: "from-blue-50 to-blue-100", bgColor: "bg-blue-50" },
  "Case Study": { color: "bg-cyan-100 text-cyan-800", icon: "📊", gradient: "from-cyan-50 to-cyan-100", bgColor: "bg-cyan-50" },
  "Presentation": { color: "bg-pink-100 text-pink-800", icon: "📽️", gradient: "from-pink-50 to-pink-100", bgColor: "bg-pink-50" },
  "Culture Fit": { color: "bg-green-100 text-green-800", icon: "🌱", gradient: "from-green-50 to-green-100", bgColor: "bg-green-50" },
  "Team Match": { color: "bg-teal-100 text-teal-800", icon: "🤝", gradient: "from-teal-50 to-teal-100", bgColor: "bg-teal-50" },
  "Founder Chat": { color: "bg-orange-100 text-orange-800", icon: "👔", gradient: "from-orange-50 to-orange-100", bgColor: "bg-orange-50" },
  "Bar Raiser": { color: "bg-pink-100 text-pink-800", icon: "⭐", gradient: "from-pink-50 to-pink-100", bgColor: "bg-pink-50" },
  "Partner Interview": { color: "bg-rose-100 text-rose-800", icon: "🤵", gradient: "from-rose-50 to-rose-100", bgColor: "bg-rose-50" },
  "Final Round": { color: "bg-violet-100 text-violet-800", icon: "🎯", gradient: "from-violet-50 to-violet-100", bgColor: "bg-violet-50" },
  "On-site": { color: "bg-indigo-100 text-indigo-800", icon: "🏢", gradient: "from-indigo-50 to-indigo-100", bgColor: "bg-indigo-500" },
  "Reference Check": { color: "bg-amber-100 text-amber-800", icon: "�", gradient: "from-amber-50 to-amber-100", bgColor: "bg-amber-50" },
  "Background Check": { color: "bg-yellow-100 text-yellow-800", icon: "🔍", gradient: "from-yellow-50 to-yellow-100", bgColor: "bg-yellow-50" },
  "Offer": { color: "bg-green-100 text-green-800", icon: "🎉", gradient: "from-green-50 to-green-100", bgColor: "bg-green-500" },
  "Negotiation": { color: "bg-blue-100 text-blue-800", icon: "💼", gradient: "from-blue-50 to-blue-100", bgColor: "bg-blue-50" },
  "Accepted": { color: "bg-emerald-100 text-emerald-800", icon: "✅", gradient: "from-emerald-50 to-emerald-100", bgColor: "bg-emerald-500" },
  "Rejected": { color: "bg-red-100 text-red-800", icon: "❌", gradient: "from-red-50 to-red-100", bgColor: "bg-red-500" },
  "Withdrawn": { color: "bg-gray-100 text-gray-800", icon: "🚫", gradient: "from-gray-50 to-gray-100", bgColor: "bg-gray-50" }
};

function ApplicationCard({ application, onMove, onDelete, onUpdate, statuses, onDragStart, onDragEnd }) {
  const [isDragging, setIsDragging] = useState(false);
  const [showJobDetail, setShowJobDetail] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
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
    console.log('formatDate received:', dateString, typeof dateString);
    if (!dateString) {
      console.log('No date string provided');
      return 'Date not available';
    }
    
    try {
      const date = new Date(dateString);
      console.log('Parsed date:', date, 'isValid:', !isNaN(date.getTime()));
      
      if (isNaN(date.getTime())) {
        console.log('Invalid date, returning fallback');
        return 'Invalid Date';
      }
      
      const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      console.log('Formatted date:', formatted);
      return formatted;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date Error';
    }
  };

  const getDaysAgo = (dateString) => {
    console.log('getDaysAgo received:', dateString);
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const result = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      console.log('Days ago result:', result);
      return result;
    } catch (error) {
      console.error('Error calculating days ago:', error);
      return 'N/A';
    }
  };

  // Debug logging for date issues
  useEffect(() => {
    console.log('=== Application Debug Info ===');
    console.log('Application ID:', application.id);
    console.log('All application fields:', Object.keys(application));
    console.log('created_at value:', application.created_at);
    console.log('updated_at value:', application.updated_at);
    console.log('Full application object:', application);
    console.log('===========================');
  }, [application]);

  return (
    <>
    <Card 
      className={`group transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-slideIn relative overflow-hidden ${
        isDragging ? 'opacity-50 rotate-2 scale-105 shadow-2xl' : ''
      }`}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
      padding={false}
    >
      {/* Delete button - trash icon in top-right corner */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm('Are you sure you want to delete this application?')) {
            onDelete(application.id);
          }
        }}
        className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"
        title="Delete application"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3,6 5,6 21,6"></polyline>
          <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>

      <div className="p-2 space-y-2 pr-6"> {/* Added right padding to avoid overlap with delete button */}
        {/* Drag Handle */}
        <div className="flex items-center justify-between">
          <div 
            className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded transition-all" 
            title="Drag to move"
            draggable="true"
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
            </svg>
          </div>
          
          {/* Status badge */}
          <Badge variant="default" size="sm" className={`text-xs ${config.color}`}>
            {application.status}
          </Badge>
        </div>
        {/* Job Information */}
        <div>
          <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
            {application.job?.title || 'Unknown Position'}
          </h4>
          <p className="text-xs text-gray-600 mb-1">
            {application.job?.company?.name || application.job?.company_name || 'Unknown Company'}
          </p>
          <p className="text-xs text-gray-500">
            Applied {formatDate(application.created_at)} • {getDaysAgo(application.created_at)}
          </p>
        </div>

        {/* Salary Info */}
        {application.job?.salary_min && application.job?.salary_max && (
          <div className="text-xs text-green-600 font-medium">
            ${application.job.salary_min.toLocaleString()} - ${application.job.salary_max.toLocaleString()}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <Button
            size="sm"
            variant="outline"
            className="text-xs flex-1"
            onClick={(e) => {
              e.stopPropagation();
              setShowJobDetail(true);
            }}
          >
            <span className="mr-1">�️</span>
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs flex-1"
            onClick={(e) => {
              e.stopPropagation();
              setShowNoteModal(true);
            }}
          >
            <span className="mr-1">📝</span>
            Note
          </Button>
        </div>
      </div>
    </Card>
    
    {/* Modals rendered outside the Card */}
    {/* Job Detail Modal */}
    {showJobDetail && (
      <JobDetailModal 
        application={application}
        onClose={() => setShowJobDetail(false)}
      />
    )}
    
    {/* Note Modal */}
    {showNoteModal && (
      <NoteModal 
        application={application}
        onClose={() => setShowNoteModal(false)}
      />
    )}
    </>
  );
}

function Column({ status, items, onMove, onDelete, onUpdate, availableStatuses, draggedItem, onDragStart, onDragEnd, stageNumber }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDropAllowed, setIsDropAllowed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const config = statusConfig[status];
  
  // Sort by date (newest first)
  const sortedItems = [...items].sort((a, b) => {
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
  
  // Progressive disclosure logic
  const INITIAL_SHOW_COUNT = 5;
  const shouldShowExpansion = sortedItems.length > INITIAL_SHOW_COUNT;
  const visibleItems = showAll ? sortedItems : sortedItems.slice(0, INITIAL_SHOW_COUNT);
  const hiddenCount = sortedItems.length - INITIAL_SHOW_COUNT;
  
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
      avgSalary: avgSalary > 0 ? avgSalary : null
    };
  };

  const stats = getColumnStats();
  
  return (
    <div className="w-full h-full">
      <div 
        className={`bg-gradient-to-br ${config.gradient} rounded-xl border-2 transition-all duration-300 overflow-hidden h-full flex flex-col ${
          isDragOver 
            ? isDropAllowed 
              ? 'border-green-400 shadow-lg scale-[1.02] bg-green-50' 
              : 'border-red-400 shadow-lg bg-red-50'
            : 'border-gray-200'
        }`}
        style={{ minHeight: '400px', maxHeight: '70vh' }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Column Header */}
        <div className="p-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {stageNumber && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md ${
                  statusConfig[status]?.bgColor || 'bg-gray-500'
                }`}>
                  {stageNumber}
                </div>
              )}
              <span className="text-lg">{config.icon}</span>
              <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">{status}</h3>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant="default" 
                size="sm" 
                className={`text-xs ${
                  items.length > 10 ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                  items.length > 5 ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                  'bg-gray-100 text-gray-600 border-gray-200'
                }`}
              >
                {items.length}
              </Badge>
              {shouldShowExpansion && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded"
                  title={showAll ? 'Show less' : `Show ${hiddenCount} more`}
                >
                  <svg 
                    className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Column Stats - More Compact */}
          {stats.count > 0 && stats.avgSalary && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span className="bg-green-100 text-green-700 px-1 py-0.5 rounded text-xs">
                ${Math.round(stats.avgSalary/1000)}k avg
              </span>
            </div>
          )}
        </div>

        {/* Drop Zone Indicator */}
        {isDragOver && (
          <div className={`p-2 text-center border-2 border-dashed ${
            isDropAllowed 
              ? 'border-green-400 bg-green-50 text-green-700' 
              : 'border-red-400 bg-red-50 text-red-700'
          }`}>
            <div className="text-xl mb-1">
              {isDropAllowed ? '⬇️' : '❌'}
            </div>
            <p className="text-xs font-medium">
              {isDropAllowed 
                ? `Move to ${status}` 
                : 'Cannot drop'
              }
            </p>
          </div>
        )}

        {/* Column Content - Scrollable */}
        <div className="p-2 space-y-2 flex-1 overflow-y-auto">
          {safeItems.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <div className="text-2xl mb-2">{config.icon}</div>
              <p className="text-xs">No applications</p>
              <p className="text-xs text-gray-400 mt-1">Drag here</p>
            </div>
          ) : (
            <>
              {visibleItems.map((app, index) => (
                <div key={app.id} style={{ animationDelay: `${index * 50}ms` }}>
                  <ApplicationCard 
                    application={app} 
                    onMove={onMove}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                    statuses={availableStatuses}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                </div>
              ))}
              
              {/* Progressive Disclosure Expansion */}
              {shouldShowExpansion && !showAll && (
                <div className="p-3 text-center border-t border-gray-100 bg-gray-50/50">
                  <button
                    onClick={() => setShowAll(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    + Show {hiddenCount} more application{hiddenCount !== 1 ? 's' : ''}
                  </button>
                </div>
              )}
              
              {/* Collapse Option */}
              {showAll && shouldShowExpansion && (
                <div className="p-3 text-center border-t border-gray-100 bg-gray-50/50">
                  <button
                    onClick={() => setShowAll(false)}
                    className="text-sm text-gray-600 hover:text-gray-700 font-medium transition-colors"
                  >
                    ↑ Show less
                  </button>
                </div>
              )}
            </>
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
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'board'
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showPipelineSettings, setShowPipelineSettings] = useState(false);
  const [currentStages, setCurrentStages] = useState(['Saved', 'Applied', 'Phone Screen', 'Tech', 'On-site', 'Offer', 'Accepted', 'Rejected']);
  const wsRef = useRef(null);
  const toast = useToast();

  // Initialize currentStages with saved preferences and used statuses from database
  useEffect(() => {
    async function initializeStages() {
      try {
        // Get actually used statuses from the backend
        const usedStatuses = await api.getUsedStatuses();
        console.log('Used statuses from API:', usedStatuses);
        
        // Try to load saved pipeline preferences from backend
        try {
          const savedPreference = await api.getPreference('pipeline_stages');
          const savedStages = savedPreference.preference_value?.stages;
          console.log('Loaded saved pipeline stages from backend:', savedStages);
          
          // Check if we have valid saved stages
          if (savedStages && Array.isArray(savedStages) && savedStages.length > 0) {
            // Merge saved stages with any new used statuses
            const missingStatuses = usedStatuses.filter(status => !savedStages.includes(status));
            const finalStages = missingStatuses.length > 0 ? [...savedStages, ...missingStatuses] : savedStages;
            console.log('Using saved stages with missing statuses added:', finalStages);
            setCurrentStages(finalStages);
          } else {
            // No valid saved stages, use defaults with used statuses
            console.log('No valid saved pipeline stages, using defaults with used statuses');
            const mergedStages = [...new Set([...DEFAULT_STAGES, ...usedStatuses])];
            console.log('Using merged stages:', mergedStages);
            setCurrentStages(mergedStages);
          }
        } catch (err) {
          // No saved preferences, use defaults with used statuses
          console.log('No saved pipeline preferences, using defaults with used statuses');
          const mergedStages = [...new Set([...DEFAULT_STAGES, ...usedStatuses])];
          console.log('Using merged stages:', mergedStages);
          setCurrentStages(mergedStages);
        }
      } catch (err) {
        console.warn("Failed to load used statuses, using defaults:", err);
        setCurrentStages(DEFAULT_STAGES);
      }
    }
    
    initializeStages();
  }, []);

  // Save pipeline stages to backend whenever they change (but not during initialization)
  useEffect(() => {
    // Safety check: ensure currentStages is a valid array
    if (!currentStages || !Array.isArray(currentStages)) {
      return;
    }
    
    const defaultStages = ['Saved', 'Applied', 'Phone Screen', 'Tech', 'On-site', 'Offer', 'Accepted', 'Rejected'];
    const isDefaultStages = currentStages.length === defaultStages.length && 
                           currentStages.every((stage, index) => stage === defaultStages[index]);
    
    if (currentStages.length > 0 && !isDefaultStages) {
      const savePreferences = async () => {
        try {
          console.log('Saving pipeline stages to backend:', currentStages);
          await api.savePreference('pipeline_stages', { stages: currentStages });
          console.log('Pipeline stages saved successfully');
        } catch (err) {
          console.warn('Failed to save pipeline stages:', err);
        }
      };
      
      // Debounce the save operation to avoid too many requests
      const timeoutId = setTimeout(savePreferences, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [currentStages]);

  // Get all applications in a flat array for easier manipulation
  const allApplications = Object.values(filteredColumns).flat();
  const hasApplications = allApplications.length > 0;

  // Filter and search applications
  useEffect(() => {
    const filtered = {};
    
    currentStages.forEach(status => {
      const items = columns[status] || [];
      
      let filteredItems = items.filter(app => {
        const matchesSearch = !searchTerm || 
          app.job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.job.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.job.location?.toLowerCase().includes(searchTerm.toLowerCase());
          
        const matchesFilter = selectedFilter === 'all' ||
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
          default:
            return 0;
        }
      });
      
      filtered[status] = filteredItems;
    });
    
    setFilteredColumns(filtered);
  }, [columns, searchTerm, selectedFilter, sortBy, currentStages]);

  async function load() {
    setLoading(true);
    try {
      const result = {};
      const promises = currentStages.map(async (status) => {
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
      if (["stage_changed", "stage_added"].includes(evt.type)) {
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
      console.error("Move error:", err);
      if (err.message === "Auth expired") {
        toast.error("Session expired, please refresh the page");
      } else {
        toast.error("Failed to move application");
      }
    }
  }

  async function deleteApplication(id) {
    console.log('=== DELETE DEBUG ===');
    console.log('Attempting to delete application with ID:', id);
    
    try {
      console.log('Calling api.deleteApp...');
      const result = await api.deleteApp(id);
      console.log('API delete result:', result);
      
      console.log('Reloading applications...');
      await load();
      console.log('Reload complete');
      
      toast.success("Application deleted successfully");
    } catch (err) {
      console.error('Delete error:', err);
      toast.error("Failed to delete application");
    }
    console.log('=== DELETE END ===');
  }

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedFilter('all');
    setSortBy('recent');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 text-lg">Loading your pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Application Pipeline
              </h1>
              <p className="text-sm text-gray-600">Track your journey to success</p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Quick Search */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* View Toggle */}
              <div className="flex bg-white border border-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    viewMode === 'cards' 
                      ? 'bg-indigo-500 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📊 Cards
                </button>
                <button
                  onClick={() => setViewMode('board')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    viewMode === 'board' 
                      ? 'bg-indigo-500 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📋 Board
                </button>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="text-purple-600 border-purple-600 hover:bg-purple-50"
              >
                📈 Analytics
              </Button>
              
              <Link href="/jobs">
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg">
                  ✨ Add Job
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats - Always Visible */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-xl">📝</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalApps || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-xl">⏳</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeApps || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-xl">🎉</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Offers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.offers || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-xl">📊</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.successRate || 0}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Settings */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pipeline Settings</h3>
            <Button
              variant="outline"
              onClick={() => setShowPipelineSettings(!showPipelineSettings)}
              className="text-sm"
            >
              {showPipelineSettings ? 'Hide Settings' : 'Customize Pipeline'}
            </Button>
          </div>
          
          {showPipelineSettings && (
            <PipelineCustomizer 
              stages={currentStages}
              onStagesChange={setCurrentStages}
              availableStages={Object.keys(statusConfig)}
              onClose={() => setShowPipelineSettings(false)}
            />
          )}
        </div>

        {/* Enhanced Analytics Panel */}
        {showAnalytics && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Detailed Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Performance Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Conversion Rate:</span>
                    <span className="font-medium text-green-600">{stats.conversionRate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Salary:</span>
                    <span className="font-medium text-blue-600">
                      {stats.avgSalary > 0 ? `$${stats.avgSalary?.toLocaleString()}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recent Activity:</span>
                    <span className="font-medium text-purple-600">{stats.recentApps || 0} this week</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Top Companies</h4>
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
                <h4 className="font-medium text-gray-900 mb-3">💡 Insights</h4>
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
          </div>
        )}

        {/* Search and Filter */}
        {hasApplications && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 gap-4">
              <div className="flex items-center space-x-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Input
                    placeholder="Search applications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/50 border-white/20"
                  />
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                </div>
                
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50"
                >
                  <option value="all">All Applications</option>
                  <option value="recent">Recent (7 days)</option>
                  <option value="with-salary">With Salary Info</option>
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50"
                >
                  <option value="recent">Sort by Date</option>
                  <option value="salary">Sort by Salary</option>
                  <option value="company">Sort by Company</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Showing {allApplications.length} of {stats.totalApps} applications</span>
                {(searchTerm || selectedFilter !== 'all' || sortBy !== 'recent') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedFilter('all');
                      setSortBy('recent');
                    }}
                    className="text-xs text-gray-500"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!hasApplications ? (
          // Empty State - Beautiful and Engaging
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🚀</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Start Your Job Hunt!</h3>
              <p className="text-gray-600 mb-8">
                Add your first job application to begin tracking your progress through our beautiful pipeline.
              </p>
              <div className="space-y-3">
                <Link href="/jobs">
                  <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg px-8 py-3">
                    ✨ Add Your First Job
                  </Button>
                </Link>
                <p className="text-sm text-gray-500">
                  Or import applications from LinkedIn, Indeed, or CSV files
                </p>
              </div>
            </div>
          </div>
        ) : viewMode === 'cards' ? (
          // Cards View - Modern, Clean Layout with Stage Numbers
          <div className="space-y-6">
            {currentStages.map((status, index) => {
              const items = filteredColumns[status] || [];
              if (items.length === 0) return null;
              
              return (
                <div key={status} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-white p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md ${
                          statusConfig[status]?.bgColor || 'bg-gray-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <span className="text-xl">{statusConfig[status]?.icon || '📋'}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{status}</h3>
                          <p className="text-sm text-gray-600">{items.length} application{items.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {items.filter(app => app.priority === 'high').length > 0 && (
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                            🔥 {items.filter(app => app.priority === 'high').length} high priority
                          </span>
                        )}
                        {items.some(app => app.job?.salary_min && app.job?.salary_max) && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                            💰 Avg $
                            {Math.round(
                              items.reduce((sum, app) => {
                                const min = app.job?.salary_min || 0;
                                const max = app.job?.salary_max || 0;
                                return sum + ((min + max) / 2);
                              }, 0) / (items.filter(app => app.job?.salary_min && app.job?.salary_max).length || 1) / 1000
                            )}k
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map((app, index) => (
                        <div key={app.id} style={{ animationDelay: `${index * 100}ms` }}>
                          <ApplicationCard 
                            application={app} 
                            onMove={move}
                            onDelete={deleteApplication}
                            onUpdate={load}
                            statuses={currentStages}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Board View - Direct Pipeline Columns
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 p-4 lg:p-6">
            {/* Pipeline Columns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4">
              {currentStages.map((status, index) => {
                const items = filteredColumns[status] || [];
                return (
                  <div key={status} className="min-h-[400px] relative">
                    <Column 
                      status={status} 
                      items={items} 
                      onMove={move}
                      onDelete={deleteApplication}
                      onUpdate={load}
                      availableStatuses={currentStages}
                      draggedItem={draggedItem}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      stageNumber={index + 1}
                    />
                    
                    {/* Flow Arrow (for larger screens) */}
                    {index < currentStages.length - 1 && (
                      <div className="hidden xl:block absolute -right-2 top-1/2 transform -translate-y-1/2 z-10">
                        <div className="bg-white rounded-full p-1 shadow-md">
                          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Job Detail Modal Component
function JobDetailModal({ application, onClose }) {
  const [stages, setStages] = useState([]);
  const [loadingStages, setLoadingStages] = useState(false);

  // Debug logging
  console.log('JobDetailModal application data:', application);

  // Load stages when modal opens
  useEffect(() => {
    if (application?.id) {
      loadStages();
    }
  }, [application?.id]);

  const loadStages = async () => {
    if (!application?.id) return;
    
    setLoadingStages(true);
    try {
      const stagesData = await api.getStages(application.id);
      setStages(Array.isArray(stagesData) ? stagesData : []);
    } catch (err) {
      console.warn('Failed to load stages:', err);
      setStages([]);
    } finally {
      setLoadingStages(false);
    }
  };

  if (!application) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Application Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Job Header */}
          <div className="border-b pb-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {application.job?.title || 'Unknown Position'}
            </h3>
            <p className="text-xl text-indigo-600 font-medium">
              {application.job?.company?.name || application.job?.company_name || 'Unknown Company'}
            </p>
          </div>

          {/* Status and Application Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Current Status</h4>
              <div className="flex items-center">
                <span className="mr-2">{statusConfig[application.status]?.icon}</span>
                <span className="font-medium">{application.status}</span>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Applied On</h4>
              <p className="text-gray-600">
                {(() => {
                  // Try different field names that might contain the date
                  const possibleDateFields = [
                    application.created_at,
                    application.applied_at,
                    application.date_applied,
                    application.application_date
                  ];
                  
                  const dateValue = possibleDateFields.find(field => field != null);
                  
                  if (!dateValue) return 'Date not available';
                  try {
                    const date = new Date(dateValue);
                    if (isNaN(date.getTime())) return 'Invalid date format';
                    return date.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric'
                    });
                  } catch (e) {
                    return 'Date parsing error';
                  }
                })()}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Days Since Applied</h4>
              <p className="text-gray-600">
                {(() => {
                  // Try different field names that might contain the date
                  const possibleDateFields = [
                    application.created_at,
                    application.applied_at,
                    application.date_applied,
                    application.application_date
                  ];
                  
                  const dateValue = possibleDateFields.find(field => field != null);
                  
                  if (!dateValue) return 'N/A';
                  try {
                    const createdDate = new Date(dateValue);
                    if (isNaN(createdDate.getTime())) return 'N/A';
                    const daysDiff = Math.ceil((new Date() - createdDate) / (1000 * 60 * 60 * 24));
                    return daysDiff + ' days';
                  } catch (e) {
                    return 'N/A';
                  }
                })()}
              </p>
            </div>
          </div>

          {/* Status History */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Status History</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              {loadingStages ? (
                <div className="text-center text-gray-500">
                  <p>Loading status history...</p>
                </div>
              ) : stages && stages.length > 0 ? (
                <div className="space-y-2">
                  {stages.map((stage, index) => (
                    <div key={stage.id || index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <span className="mr-2">{statusConfig[stage.name]?.icon || '📋'}</span>
                        <span>{stage.name}</span>
                        {stage.notes && (
                          <span className="ml-2 text-xs text-gray-500">- {stage.notes}</span>
                        )}
                      </div>
                      <span className="text-gray-500">
                        {stage.created_at ? new Date(stage.created_at).toLocaleDateString() : 'Unknown date'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p>No status changes recorded yet</p>
                  <p className="text-xs mt-1">Status changes will appear here as you move applications</p>
                </div>
              )}
            </div>
          </div>

          {/* Job Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location */}
            {application.job?.location && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">📍 Location</h4>
                <p className="text-gray-600">{application.job.location}</p>
              </div>
            )}

            {/* Work Type */}
            {application.job?.remote_type && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">💼 Work Type</h4>
                <p className="text-gray-600">{application.job.remote_type}</p>
              </div>
            )}

            {/* Job Type */}
            {application.job?.job_type && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">⏰ Job Type</h4>
                <p className="text-gray-600">{application.job.job_type}</p>
              </div>
            )}

            {/* Salary Range */}
            {(application.job?.salary_min || application.job?.salary_max) && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">💰 Salary Range</h4>
                <p className="text-green-600 font-medium">
                  ${application.job.salary_min?.toLocaleString() || 'N/A'} - ${application.job.salary_max?.toLocaleString() || 'N/A'}
                </p>
              </div>
            )}
          </div>

          {/* Priority */}
          {application.priority && application.priority !== 'normal' && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Priority</h4>
              <div className="flex items-center">
                <span className="mr-2">
                  {application.priority === 'high' ? '🔥' : application.priority === 'medium' ? '⭐' : '📌'}
                </span>
                <span className={`capitalize font-medium ${
                  application.priority === 'high' ? 'text-red-600' : 
                  application.priority === 'medium' ? 'text-yellow-600' : 'text-gray-600'
                }`}>
                  {application.priority} priority
                </span>
              </div>
            </div>
          )}

          {/* Source URL */}
          {application.job?.source_url && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">🔗 Source URL</h4>
              <a
                href={application.job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 underline break-all"
              >
                {application.job.source_url}
              </a>
            </div>
          )}

          {/* Description */}
          {application.job?.description && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">📝 Job Description</h4>
              <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {application.job.description}
                </pre>
              </div>
            </div>
          )}

          {/* Requirements */}
          {application.job?.requirements && application.job.requirements.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">✅ Requirements</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <ul className="list-disc list-inside space-y-1">
                  {application.job.requirements.map((req, index) => (
                    <li key={index} className="text-sm text-gray-700">{req}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Skills */}
          {application.job?.skills && application.job.skills.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">🛠️ Required Skills</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex flex-wrap gap-2">
                  {application.job.skills.map((skill, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Benefits */}
          {application.job?.benefits && application.job.benefits.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">🎁 Benefits & Perks</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <ul className="list-disc list-inside space-y-1">
                  {application.job.benefits.map((benefit, index) => (
                    <li key={index} className="text-sm text-gray-700">{benefit}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Application Metadata */}
          <div className="border-t pt-4">
            <div className="text-sm text-gray-500 space-y-1">
              <p>Application ID: {application.id}</p>
              <p>Created: {new Date(application.created_at).toLocaleString()}</p>
              {application.updated_at && (
                <p>Last Updated: {new Date(application.updated_at).toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// Note Modal Component
function NoteModal({ application, onClose }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [editText, setEditText] = useState('');

  // Load notes for this application (without demo notes)
  useEffect(() => {
    loadNotes();
  }, [application.id]);

  const loadNotes = async () => {
    setLoading(true);
    console.log('=== LOADING NOTES ===');
    console.log('Application ID:', application.id);
    
    try {
      const notesData = await api.getNotes(application.id);
      console.log('Notes loaded from API:', notesData);
      setNotes(notesData || []);
    } catch (error) {
      console.error('Failed to load notes:', error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setLoading(true);
    console.log('=== ADDING NOTE ===');
    console.log('Application ID:', application.id);
    console.log('Note content:', newNote.trim());
    
    try {
      const savedNote = await api.addNote(application.id, newNote.trim());
      console.log('Note saved to API:', savedNote);
      setNotes(prev => [savedNote, ...prev]);
      setNewNote('');
    } catch (error) {
      console.error('Failed to add note:', error);
      // Show error message to user
      alert('Failed to save note. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditNote = async (noteId, newContent) => {
    if (!newContent.trim()) return;

    try {
      // For now, just update locally since there's no backend edit endpoint
      // TODO: Implement backend note update endpoint
      setNotes(prev => prev.map(note => 
        note.id === noteId 
          ? { ...note, body: newContent.trim(), updated_at: new Date().toISOString() }
          : note
      ));
      setEditingNote(null);
      setEditText('');
      
      // Show a warning that changes are local only
      console.warn('Note edited locally only - backend update endpoint not implemented');
    } catch (error) {
      console.error('Failed to edit note:', error);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      // In real implementation, call API to delete note
      setNotes(prev => prev.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const startEditing = (note) => {
    setEditingNote(note.id);
    setEditText(note.body || note.content);
  };

  const cancelEditing = () => {
    setEditingNote(null);
    setEditText('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Notes</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Job Info */}
        <div className="px-6 py-3 bg-gray-50 border-b flex-shrink-0">
          <h3 className="font-medium text-gray-900 text-sm">
            {application.job?.title || 'Unknown Position'}
          </h3>
          <p className="text-xs text-gray-600">
            {application.job?.company?.name || application.job?.company_name || 'Unknown Company'}
          </p>
        </div>

        {/* Add New Note */}
        <div className="p-4 border-b flex-shrink-0">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!newNote.trim() || loading}
            >
              {loading ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-4">
          {notes.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <span className="text-2xl mb-2 block">📝</span>
              <p>No notes yet</p>
              <p className="text-sm">Add your first note above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                  {editingNote === note.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        rows={3}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={cancelEditing}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <Button
                          size="sm"
                          onClick={() => handleEditNote(note.id, editText)}
                          disabled={!editText.trim()}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-gray-900 text-sm flex-1 pr-2">{note.body || note.content}</p>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => startEditing(note)}
                            className="text-gray-400 hover:text-indigo-600 p-1"
                            title="Edit note"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-gray-400 hover:text-red-600 p-1"
                            title="Delete note"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>
                          {new Date(note.created_at).toLocaleDateString()} at{' '}
                          {new Date(note.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {note.updated_at && note.updated_at !== note.created_at && (
                          <span className="text-gray-400">
                            Edited {new Date(note.updated_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end p-4 border-t bg-gray-50 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// Pipeline Customizer Component
function PipelineCustomizer({ stages, onStagesChange, availableStages, onClose }) {
  const [tempStages, setTempStages] = useState([...stages]);
  const [draggedStage, setDraggedStage] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const addStage = (stageName) => {
    if (!tempStages.includes(stageName)) {
      setTempStages([...tempStages, stageName]);
    }
  };

  const removeStage = (stageName) => {
    setTempStages(tempStages.filter(s => s !== stageName));
  };

  const handleDragStart = (e, stage, index) => {
    setDraggedStage({ stage, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (draggedStage && draggedStage.index !== dropIndex) {
      const newStages = [...tempStages];
      const [removed] = newStages.splice(draggedStage.index, 1);
      newStages.splice(dropIndex, 0, removed);
      setTempStages(newStages);
    }
    
    setDraggedStage(null);
  };

  const saveChanges = () => {
    console.log('PipelineCustomizer: Saving stages to parent:', tempStages);
    onStagesChange(tempStages);
    if (onClose) onClose(); // Auto-close settings panel
  };

  const resetToDefaults = () => {
    setTempStages(['Saved', 'Applied', 'Phone Screen', 'Tech', 'On-site', 'Offer', 'Accepted', 'Rejected']);
  };

  const cancel = () => {
    setTempStages([...stages]);
    if (onClose) onClose(); // Auto-close settings panel
  };

  return (
    <div className="space-y-6">
      {/* Current Pipeline Order */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Current Pipeline Order</h4>
        <p className="text-sm text-gray-600 mb-4">Drag and drop to reorder stages</p>
        <div className="space-y-2 mb-4">
          {tempStages.map((stage, index) => (
            <div 
              key={stage} 
              draggable
              onDragStart={(e) => handleDragStart(e, stage, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`flex items-center bg-white border rounded-lg p-3 cursor-move hover:shadow-md transition-all ${
                dragOverIndex === index ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'
              } ${draggedStage?.index === index ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center text-gray-400 mr-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-500 mr-3">{index + 1}.</span>
              <span className="text-sm mr-2">{statusConfig[stage]?.icon}</span>
              <span className="text-sm font-medium flex-1">{stage}</span>
              <button
                onClick={() => removeStage(stage)}
                className="ml-2 text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                title="Remove stage"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Available Stages to Add */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Available Stages</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
          {availableStages
            .filter(stage => !tempStages.includes(stage))
            .map(stage => (
              <button
                key={stage}
                onClick={() => addStage(stage)}
                className="flex items-center bg-indigo-50 text-indigo-700 rounded-lg p-2 hover:bg-indigo-100 transition-colors text-sm"
              >
                <span className="mr-1">{statusConfig[stage]?.icon}</span>
                <span className="truncate">{stage}</span>
                <svg className="w-3 h-3 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={resetToDefaults}>
          Reset to Defaults
        </Button>
        <div className="space-x-3">
          <Button variant="outline" onClick={cancel}>
            Cancel
          </Button>
          <Button onClick={saveChanges}>
            Save Pipeline
          </Button>
        </div>
      </div>
    </div>
  );
}
