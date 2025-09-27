import React from 'react';
import { Link } from 'react-router-dom';
import { 
  GitCommit, 
  CheckSquare, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Minus,
  User,
  Calendar,
  Award
} from 'lucide-react';
import { format } from 'date-fns';

interface UserCardProps {
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    avatar?: string;
    totalCommits: number;
    totalLinesAdded: number;
    totalLinesDeleted: number;
    totalTasksCompleted: number;
    totalTimeSpent: number;
    productivityScore: number;
    lastSeen?: string;
    recentActivity?: {
      commits: number;
      tasksCompleted: number;
      timeSpent: number;
    };
  };
  period?: string;
}

const UserCard: React.FC<UserCardProps> = ({ user, period = 'recent' }) => {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const getProductivityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProductivityIcon = (score: number) => {
    if (score >= 60) return <TrendingUp className="h-4 w-4" />;
    if (score >= 40) return <Minus className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  return (
    <Link
      to={`/users/${user.id}`}
      className="block card hover:shadow-md dark:hover:shadow-gray-900/50 transition-all duration-200 transform hover:-translate-y-1"
    >
      <div className="card-body">
        {/* User Header */}
        <div className="flex items-start space-x-4 mb-4">
          <div className="flex-shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <User className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {user.name || user.username}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              @{user.username}
            </p>
            {user.lastSeen && (
              <div className="flex items-center space-x-1 mt-1">
                <Calendar className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-400">
                  Last seen {format(new Date(user.lastSeen), 'MMM d, yyyy')}
                </span>
              </div>
            )}
          </div>

          {/* Productivity Score */}
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 ${getProductivityColor(user.productivityScore)}`}>
              {getProductivityIcon(user.productivityScore)}
              <span className="text-sm font-medium">
                {Math.round(user.productivityScore)}
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Code Statistics */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center space-x-2 mb-2">
              <GitCommit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Code</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Commits:</span>
                <span className="font-medium">{user.totalCommits}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-green-600 dark:text-green-400">+{(user.totalLinesAdded || 0).toLocaleString()}</span>
                <span className="text-red-600 dark:text-red-400">-{(user.totalLinesDeleted || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Net:</span>
                <span className={`font-medium ${
                  ((user.totalLinesAdded || 0) - (user.totalLinesDeleted || 0)) >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {((user.totalLinesAdded || 0) - (user.totalLinesDeleted || 0)) >= 0 ? '+' : ''}
                  {((user.totalLinesAdded || 0) - (user.totalLinesDeleted || 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          
          {/* Task Statistics */}
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center space-x-2 mb-2">
              <CheckSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tasks</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Completed:</span>
                <span className="font-medium">{user.totalTasksCompleted}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Time:</span>
                <span className="font-medium">{formatTime(user.totalTimeSpent)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Avg/Task:</span>
                <span className="font-medium">
                  {user.totalTasksCompleted > 0 
                    ? formatTime(Math.round(user.totalTimeSpent / user.totalTasksCompleted))
                    : '0m'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity with Enhanced Metrics */}
        {user.recentActivity && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-500 dark:text-gray-400">
                {period === 'recent' ? 'Last 30 days:' : `Recent activity:`}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="text-blue-600 dark:text-blue-400 font-medium">
                  {user.recentActivity.commits}
                </div>
                <div className="text-gray-500 dark:text-gray-400">commits</div>
              </div>
              <div className="text-center">
                <div className="text-green-600 dark:text-green-400 font-medium">
                  {user.recentActivity.tasksCompleted}
                </div>
                <div className="text-gray-500 dark:text-gray-400">tasks</div>
              </div>
              <div className="text-center">
                <div className="text-purple-600 dark:text-purple-400 font-medium">
                  {formatTime(user.recentActivity.timeSpent)}
                </div>
                <div className="text-gray-500 dark:text-gray-400">time</div>
              </div>
            </div>
          </div>
        )}

        {/* Performance Badge */}
        {user.productivityScore >= 80 && (
          <div className="absolute top-4 right-4">
            <div className="flex items-center space-x-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full text-xs font-medium">
              <Award className="h-3 w-3" />
              <span>Top Performer</span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
};

export default UserCard;
