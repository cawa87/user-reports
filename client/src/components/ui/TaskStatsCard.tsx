import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  PlayCircle, 
  PauseCircle,
  Target,
  TrendingUp,
  Timer
} from 'lucide-react';

interface TaskStatsCardProps {
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    blocked?: number;
    review?: number;
    byPriority?: {
      high: number;
      medium: number;
      low: number;
    };
    totalTimeSpent: number;
    avgCompletionTime?: number;
    completionRate?: number;
  };
  period?: string;
  className?: string;
}

const TaskStatsCard: React.FC<TaskStatsCardProps> = ({ 
  stats, 
  period = 'this period',
  className = '' 
}) => {
  const completionRate = stats.completionRate ?? (stats.total > 0 ? (stats.completed / stats.total) * 100 : 0);
  
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'inProgress': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'todo': return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50';
      case 'blocked': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'review': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className={`card ${className}`}>
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-title flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Task Analytics
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {period}
          </span>
        </div>

        {/* Completion Rate Overview */}
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Completion Rate
              </span>
            </div>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {Math.round(completionRate)}%
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {stats.completed} of {stats.total} tasks completed
          </div>
        </div>

        {/* Task Status Breakdown */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`text-center p-3 rounded-lg ${getStatusColor('completed')}`}>
            <div className="flex items-center justify-center space-x-1 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-lg font-semibold">
                {stats.completed}
              </span>
            </div>
            <div className="text-xs">Completed</div>
          </div>

          <div className={`text-center p-3 rounded-lg ${getStatusColor('inProgress')}`}>
            <div className="flex items-center justify-center space-x-1 mb-1">
              <PlayCircle className="h-4 w-4" />
              <span className="text-lg font-semibold">
                {stats.inProgress}
              </span>
            </div>
            <div className="text-xs">In Progress</div>
          </div>

          <div className={`text-center p-3 rounded-lg ${getStatusColor('todo')}`}>
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-lg font-semibold">
                {stats.todo}
              </span>
            </div>
            <div className="text-xs">To Do</div>
          </div>

          {(stats.blocked !== undefined || stats.review !== undefined) && (
            <div className={`text-center p-3 rounded-lg ${getStatusColor(stats.blocked ? 'blocked' : 'review')}`}>
              <div className="flex items-center justify-center space-x-1 mb-1">
                {stats.blocked ? <PauseCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span className="text-lg font-semibold">
                  {stats.blocked || stats.review || 0}
                </span>
              </div>
              <div className="text-xs">{stats.blocked ? 'Blocked' : 'Review'}</div>
            </div>
          )}
        </div>

        {/* Priority Distribution */}
        {stats.byPriority && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority Distribution
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className={`text-sm ${getPriorityColor('high')}`}>High Priority</span>
                <span className="text-sm font-medium">{stats.byPriority.high}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm ${getPriorityColor('medium')}`}>Medium Priority</span>
                <span className="text-sm font-medium">{stats.byPriority.medium}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm ${getPriorityColor('low')}`}>Low Priority</span>
                <span className="text-sm font-medium">{stats.byPriority.low}</span>
              </div>
            </div>
          </div>
        )}

        {/* Time Analytics */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400 flex items-center">
              <Timer className="h-3 w-3 mr-1" />
              Total time:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatTime(stats.totalTimeSpent)}
            </span>
          </div>
          
          {stats.avgCompletionTime && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Avg. completion:
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatTime(stats.avgCompletionTime)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskStatsCard;
