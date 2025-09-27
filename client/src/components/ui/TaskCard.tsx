import React from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  User, 
  Calendar,
  AlertCircle,
  Timer,
  ExternalLink,
  Flag,
  PlayCircle,
  Pause,
  XCircle
} from 'lucide-react';

interface TaskCardProps {
  task: {
    id: string;
    clickupId: string;
    name: string;
    description?: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CLOSED' | 'ON_HOLD';
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    dueDate?: string;
    timeSpent: number;
    clickupUrl?: string;
    spaceId: string;
    spaceName?: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    assignee?: {
      id: string;
      name: string;
      username: string;
      avatar?: string;
    };
    _count?: {
      timeEntries: number;
    };
  };
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'DONE':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'CLOSED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'ON_HOLD':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return 'text-red-600 dark:text-red-400';
      case 'HIGH':
        return 'text-orange-600 dark:text-orange-400';
      case 'NORMAL':
        return 'text-blue-600 dark:text-blue-400';
      case 'LOW':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'TODO':
        return Circle;
      case 'IN_PROGRESS':
        return PlayCircle;
      case 'DONE':
      case 'CLOSED':
        return CheckCircle2;
      case 'ON_HOLD':
        return Pause;
      default:
        return Circle;
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
      case 'HIGH':
        return AlertCircle;
      case 'NORMAL':
      case 'LOW':
        return Flag;
      default:
        return Flag;
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'TODO':
        return 'To Do';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'DONE':
        return 'Done';
      case 'CLOSED':
        return 'Closed';
      case 'ON_HOLD':
        return 'On Hold';
      default:
        return status;
    }
  };

  const StatusIcon = getStatusIcon(task.status);
  const PriorityIcon = getPriorityIcon(task.priority);

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !['DONE', 'CLOSED'].includes(task.status);

  return (
    <div className={`card hover:shadow-lg transition-shadow ${isOverdue ? 'border-red-200 dark:border-red-800' : ''}`}>
      <div className="card-body">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <StatusIcon className={`h-5 w-5 ${task.status === 'DONE' || task.status === 'CLOSED' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} />
              <Link
                to={`/tasks/${task.clickupId}`}
                className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
              >
                {task.name}
              </Link>
            </div>
            
            {task.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                {task.description}
              </p>
            )}
            
            <div className="flex items-center space-x-2 flex-wrap">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                {formatStatus(task.status)}
              </span>
              
              {task.priority && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 ${getPriorityColor(task.priority)}`}>
                  <PriorityIcon className="h-3 w-3 mr-1" />
                  {task.priority}
                </span>
              )}

              {task.spaceName && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                  {task.spaceName}
                </span>
              )}
            </div>
          </div>

          <div className="flex space-x-2 ml-4">
            {task.clickupUrl && (
              <a
                href={task.clickupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                title="View in ClickUp"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        {/* Task Details */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Assignee */}
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            {task.assignee ? (
              <div className="flex items-center space-x-2 min-w-0">
                {task.assignee.avatar ? (
                  <img
                    src={task.assignee.avatar}
                    alt={task.assignee.name}
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <User className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
                <span className="text-sm text-gray-900 dark:text-white truncate">
                  {task.assignee.name}
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">Unassigned</span>
            )}
          </div>

          {/* Due Date */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            {task.dueDate ? (
              <span className={`text-sm ${
                isOverdue 
                  ? 'text-red-600 dark:text-red-400 font-medium' 
                  : 'text-gray-900 dark:text-white'
              }`}>
                {format(new Date(task.dueDate), 'MMM d, yyyy')}
              </span>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">No due date</span>
            )}
          </div>

          {/* Time Spent */}
          <div className="flex items-center space-x-2">
            <Timer className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <span className="text-sm text-gray-900 dark:text-white">
              {task.timeSpent > 0 ? formatTime(task.timeSpent) : '0m'}
            </span>
          </div>

          {/* Time Entries */}
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <span className="text-sm text-gray-900 dark:text-white">
              {task._count?.timeEntries || 0} entries
            </span>
          </div>
        </div>

        {/* Overdue Alert */}
        {isOverdue && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-800 dark:text-red-300">
              Overdue by {formatDistanceToNow(new Date(task.dueDate!))}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Updated {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
          </div>
          
          <Link
            to={`/tasks/${task.clickupId}`}
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            View Details →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;

