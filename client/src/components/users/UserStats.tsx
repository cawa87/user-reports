import React from 'react';
import { 
  Users, 
  UserCheck, 
  GitCommit, 
  CheckSquare, 
  Clock, 
  TrendingUp,
  Award
} from 'lucide-react';

interface UserStatsProps {
  statistics: {
    totalUsers: number;
    activeUsers: number;
    totalCommits: number;
    totalTasks: number;
    totalTimeSpent: number;
    totalLinesAdded?: number;
    totalLinesDeleted?: number;
    avgProductivity: number;
    topPerformer: any;
  };
  isLoading?: boolean;
}

const UserStats: React.FC<UserStatsProps> = ({ statistics, isLoading }) => {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
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
      label: 'Total Users',
      value: statistics.totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      subtitle: `${statistics.activeUsers} active`,
    },
    {
      label: 'Code Lines',
      value: ((statistics.totalLinesAdded || 0) + (statistics.totalLinesDeleted || 0)).toLocaleString(),
      icon: GitCommit,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
      subtitle: `${statistics.totalCommits} commits`,
    },
    {
      label: 'Net Code Impact',
      value: ((statistics.totalLinesAdded || 0) - (statistics.totalLinesDeleted || 0)).toLocaleString(),
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900',
      subtitle: `+${(statistics.totalLinesAdded || 0).toLocaleString()} -${(statistics.totalLinesDeleted || 0).toLocaleString()}`,
    },
    {
      label: 'Tasks Completed',
      value: statistics.totalTasks.toLocaleString(),
      icon: CheckSquare,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      subtitle: `${formatTime(statistics.totalTimeSpent)} tracked`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
                {stat.subtitle && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {stat.subtitle}
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Average Productivity */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value">
                {Math.round(statistics.avgProductivity)}%
              </div>
              <div className="stat-label">Avg. Productivity</div>
            </div>
            <div className="p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900">
              <TrendingUp className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        {/* Total Time Spent */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value">
                {formatTime(statistics.totalTimeSpent)}
              </div>
              <div className="stat-label">Total Time Tracked</div>
            </div>
            <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900">
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        {/* Top Performer */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {statistics.topPerformer?.name || 'N/A'}
              </div>
              <div className="stat-label">Top Performer</div>
              {statistics.topPerformer && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {Math.round(statistics.topPerformer.productivityScore)}% productivity
                </div>
              )}
            </div>
            <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900">
              <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStats;
