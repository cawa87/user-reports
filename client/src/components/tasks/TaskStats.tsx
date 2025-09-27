import React from 'react';
import { 
  CheckSquare, 
  Clock, 
  Target, 
  TrendingUp,
  AlertTriangle,
  Timer,
  Users,
  BarChart3
} from 'lucide-react';

interface TaskStatsProps {
  analytics: {
    overview: {
      totalTasks: number;
      completedTasks: number;
      completionRate: number;
      overdueTasks: number;
      totalTimeSpent: number;
      avgCompletionTime: number;
      avgCompletionDays: number;
      taskVelocity: number;
    };
    breakdown: {
      byStatus: Array<{
        status: string;
        count: number;
        percentage: number;
      }>;
      byPriority: Array<{
        priority: string;
        count: number;
        percentage: number;
      }>;
    };
    trends: {
      topPerformers: Array<{
        user: {
          name: string;
          username: string;
          avatar?: string;
        };
        tasksCompleted: number;
        timeSpent: number;
      }>;
    };
  };
  isLoading?: boolean;
}

const TaskStats: React.FC<TaskStatsProps> = ({ analytics, isLoading }) => {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card">
            <div className="skeleton h-8 w-16 mb-2"></div>
            <div className="skeleton h-4 w-24"></div>
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Tasks',
      value: analytics.overview.totalTasks.toLocaleString(),
      subtitle: `${analytics.overview.completedTasks} completed`,
      icon: CheckSquare,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Completion Rate',
      value: `${analytics.overview.completionRate.toFixed(1)}%`,
      subtitle: `${analytics.overview.overdueTasks} overdue`,
      icon: Target,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Time Tracked',
      value: formatTime(analytics.overview.totalTimeSpent),
      subtitle: `${formatTime(analytics.overview.avgCompletionTime)} avg`,
      icon: Timer,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'Task Velocity',
      value: `${analytics.overview.taskVelocity.toFixed(1)}/day`,
      subtitle: `${analytics.overview.avgCompletionDays.toFixed(1)} days avg completion`,
      icon: TrendingUp,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className={`stat-card ${stat.bgColor} border-0`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${stat.bgColor.replace(/\/20$/, '/40')}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {stat.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stat.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tasks by Status
              </h3>
            </div>
            
            <div className="space-y-3">
              {analytics.breakdown.byStatus.map((status) => {
                const getStatusColor = (statusName: string) => {
                  switch (statusName) {
                    case 'TODO':
                      return 'bg-gray-200 dark:bg-gray-700';
                    case 'IN_PROGRESS':
                      return 'bg-blue-500';
                    case 'DONE':
                    case 'CLOSED':
                      return 'bg-green-500';
                    case 'ON_HOLD':
                      return 'bg-yellow-500';
                    default:
                      return 'bg-gray-400';
                  }
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

                return (
                  <div key={status.status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(status.status)}`}></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {formatStatus(status.status)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {status.count}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({status.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tasks by Priority
              </h3>
            </div>
            
            <div className="space-y-3">
              {analytics.breakdown.byPriority.map((priority) => {
                const getPriorityColor = (priorityName: string) => {
                  switch (priorityName) {
                    case 'URGENT':
                      return 'bg-red-500';
                    case 'HIGH':
                      return 'bg-orange-500';
                    case 'NORMAL':
                      return 'bg-blue-500';
                    case 'LOW':
                      return 'bg-green-500';
                    default:
                      return 'bg-gray-400';
                  }
                };

                return (
                  <div key={priority.priority} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(priority.priority)}`}></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {priority.priority}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {priority.count}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({priority.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      {analytics.trends.topPerformers.length > 0 && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center space-x-2 mb-4">
              <Users className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top Performers
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.trends.topPerformers.slice(0, 6).map((performer, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {performer.user.avatar ? (
                    <img
                      src={performer.user.avatar}
                      alt={performer.user.name}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {performer.user.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {performer.tasksCompleted} tasks • {formatTime(performer.timeSpent)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskStats;

