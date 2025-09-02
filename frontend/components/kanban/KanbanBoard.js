import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';

const DEFAULT_COLUMNS = [
  { id: 'saved', title: 'Saved', color: 'bg-gray-100', headerColor: 'bg-gray-500' },
  { id: 'applied', title: 'Applied', color: 'bg-blue-100', headerColor: 'bg-blue-500' },
  { id: 'phone-screen', title: 'Phone Screen', color: 'bg-yellow-100', headerColor: 'bg-yellow-500' },
  { id: 'technical', title: 'Technical', color: 'bg-purple-100', headerColor: 'bg-purple-500' },
  { id: 'final', title: 'Final Round', color: 'bg-orange-100', headerColor: 'bg-orange-500' },
  { id: 'offer', title: 'Offer', color: 'bg-green-100', headerColor: 'bg-green-500' },
  { id: 'rejected', title: 'Rejected', color: 'bg-red-100', headerColor: 'bg-red-500' }
];

const ApplicationCard = ({ application, index }) => {
  const getCompanyInitials = (company) => {
    return company ? company.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2) : '??';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <Draggable draggableId={application.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 transition-all duration-200 hover:shadow-md ${
            snapshot.isDragging ? 'shadow-lg rotate-2' : ''
          }`}
        >
          {/* Company Avatar & Info */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                {getCompanyInitials(application.job?.company)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {application.job?.title || 'Unknown Position'}
                </h3>
                <p className="text-xs text-gray-600 truncate">
                  {application.job?.company || 'Unknown Company'}
                </p>
              </div>
            </div>
            {application.priority && (
              <div className={`w-2 h-2 rounded-full ${getPriorityColor(application.priority)}`} />
            )}
          </div>

          {/* Details */}
          <div className="space-y-2">
            {application.job?.location && (
              <div className="flex items-center text-xs text-gray-500">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {application.job.location}
              </div>
            )}
            
            {application.job?.salary_range && (
              <div className="flex items-center text-xs text-gray-500">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                {application.job.salary_range}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Applied {formatDate(application.created_at)}</span>
              {application.deadline && (
                <span className="text-orange-600 font-medium">
                  Due {formatDate(application.deadline)}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex space-x-1">
              <button className="text-gray-400 hover:text-blue-500 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
              <button className="text-gray-400 hover:text-green-500 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </button>
            </div>
            <button className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
              View Details
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
};

const KanbanColumn = ({ column, applications }) => {
  return (
    <div className="flex-shrink-0 w-80">
      <div className={`${column.headerColor} text-white p-3 rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{column.title}</h3>
          <span className="bg-white bg-opacity-20 text-xs px-2 py-1 rounded-full">
            {applications.length}
          </span>
        </div>
      </div>
      
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`${column.color} min-h-96 p-3 rounded-b-lg transition-colors ${
              snapshot.isDraggingOver ? 'bg-opacity-50' : ''
            }`}
          >
            {applications.map((application, index) => (
              <ApplicationCard
                key={application.id}
                application={application}
                index={index}
              />
            ))}
            {provided.placeholder}
            
            {applications.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                <p className="text-sm">No applications</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default function KanbanBoard() {
  const [applications, setApplications] = useState({});
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const response = await api.getApplications();
      const groupedApplications = DEFAULT_COLUMNS.reduce((acc, column) => {
        acc[column.id] = response.filter(app => 
          app.status?.toLowerCase().replace(' ', '-') === column.id
        );
        return acc;
      }, {});
      setApplications(groupedApplications);
    } catch (error) {
      toast.error('Failed to load applications');
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Optimistic update
    const newApplications = { ...applications };
    const sourceApps = Array.from(newApplications[source.droppableId]);
    const destApps = source.droppableId === destination.droppableId 
      ? sourceApps 
      : Array.from(newApplications[destination.droppableId]);
    
    const [removed] = sourceApps.splice(source.index, 1);
    destApps.splice(destination.index, 0, removed);
    
    newApplications[source.droppableId] = sourceApps;
    newApplications[destination.droppableId] = destApps;
    
    setApplications(newApplications);

    // API update
    try {
      const newStatus = destination.droppableId.replace('-', ' ');
      await api.updateApplicationStatus(draggableId, newStatus);
      toast.success(`Moved to ${DEFAULT_COLUMNS.find(col => col.id === destination.droppableId)?.title}`);
    } catch (error) {
      toast.error('Failed to update application status');
      loadApplications(); // Revert on error
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Application Pipeline</h1>
          <p className="text-gray-600 mt-1">Track your job applications through each stage</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>Quick Add</span>
          </button>
          <button
            onClick={loadApplications}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {DEFAULT_COLUMNS.map(column => (
            <KanbanColumn
              key={column.id}
              column={column}
              applications={applications[column.id] || []}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
