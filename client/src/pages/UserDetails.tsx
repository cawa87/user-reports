import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { 
  ArrowLeft, 
  Calendar, 
  GitCommit, 
  CheckSquare, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  User, 
  Mail, 
  MapPin,
  Award,
  Activity,
  RefreshCw
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { usersApi } from '@/services/api';
import DateRangePicker from '@/components/ui/DateRangePicker';
import CodeStatsCard from '@/components/ui/CodeStatsCard';
import TaskStatsCard from '@/components/ui/TaskStatsCard';

const UserDetails: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [startDate, setStartDate] = React.useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = React.useState(new Date());

  const {
    data: userResponse,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['user', userId, startDate, endDate],
    () => usersApi.getById(userId!, { startDate, endDate }),
    {
      enabled: !!userId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  const user = userResponse?.data?.user;
  const stats = userResponse?.data?.stats;
  const recentActivity = userResponse?.data?.recentActivity;

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
    if (score >= 60) return <TrendingUp className="h-5 w-5" />;
    if (score >= 40) return <Activity className="h-5 w-5" />;
    return <TrendingDown className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link to="/users" className="btn btn-ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Link>
        </div>
        
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center space-x-2 text-gray-500">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading user details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link to="/users" className="btn btn-ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Link>
        </div>
        
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <User className="h-12 w-12 mx-auto opacity-50" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            User not found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            The requested user could not be found or loaded.
          </p>
          <button
            onClick={() => refetch()}
            className="btn btn-primary mr-3"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
          <Link to="/users" className="btn btn-secondary">
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/users" className="btn btn-ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Link>
        </div>
        
        <div className="flex items-center space-x-3">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />
          
          <button
            onClick={() => refetch()}
            className="btn btn-secondary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* User Profile */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  <User className="h-10 w-10 text-primary-600 dark:text-primary-400" />
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-3">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {user.name || user.username}
                </h1>
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 ${getProductivityColor(stats?.productivity?.score || 0)}`}>
                  {getProductivityIcon(stats?.productivity?.score || 0)}
                  <span className="font-medium">
                    {Math.round(stats?.productivity?.score || 0)}% Productivity
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>@{user.username}</span>
                </div>
                {user.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                )}
                {user.lastSeen && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Last seen {format(new Date(user.lastSeen), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
              
              {user.bio && (
                <p className="mt-3 text-gray-700 dark:text-gray-300">
                  {user.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Code and Task Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <CodeStatsCard
        stats={{
          linesAdded: stats?.commits?.linesAdded || 0,
          linesDeleted: stats?.commits?.linesDeleted || 0,
          filesChanged: stats?.commits?.filesChanged || 0,
          commitsCount: stats?.commits?.total || 0,
        }}
        period={`All time (${stats?.commits?.totalInPeriod || 0} commits in selected period)`}
      />
        
        <TaskStatsCard
          stats={{
            total: stats?.tasks?.total || 0,
            completed: stats?.tasks?.completed || 0,
            inProgress: stats?.tasks?.inProgress || 0,
            todo: (stats?.tasks?.total || 0) - (stats?.tasks?.completed || 0) - (stats?.tasks?.inProgress || 0),
            totalTimeSpent: stats?.tasks?.timeSpent || 0,
            avgCompletionTime: stats?.timeTracking?.avgSessionLength,
            completionRate: stats?.tasks?.total > 0 ? (stats.tasks.completed / stats.tasks.total) * 100 : 0,
          }}
          period={`${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`}
        />
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value text-blue-600 dark:text-blue-400">
                {stats?.commits?.total || 0}
              </div>
              <div className="stat-label">Commits</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {((stats?.commits?.linesAdded || 0) + (stats?.commits?.linesDeleted || 0)).toLocaleString()} lines touched
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
              <GitCommit className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value text-green-600 dark:text-green-400">
                {Math.round(stats?.tasks?.total > 0 ? (stats.tasks.completed / stats.tasks.total) * 100 : 0)}%
              </div>
              <div className="stat-label">Completion Rate</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats?.tasks?.completed || 0} of {stats?.tasks?.total || 0} tasks
              </div>
            </div>
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
              <CheckSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value text-purple-600 dark:text-purple-400">
                {formatTime(stats?.timeTracking?.totalTime || 0)}
              </div>
              <div className="stat-label">Time Tracked</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats?.timeTracking?.sessions || 0} sessions
              </div>
            </div>
            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900">
              <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value text-yellow-600 dark:text-yellow-400">
                {((stats?.commits?.linesAdded || 0) - (stats?.commits?.linesDeleted || 0)).toLocaleString()}
              </div>
              <div className="stat-label">Net Code Change</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Lines of impact
              </div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900">
              <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Commits */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Commits</h3>
          </div>
          <div className="card-body">
            {recentActivity?.commits?.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.commits.slice(0, 10).map((commit: any) => (
                  <div key={commit.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <GitCommit className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                        {commit.message}
                      </p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{commit.project?.name}</span>
                        <span>{format(new Date(commit.authorDate), 'MMM d, h:mm a')}</span>
                        {commit.additions && commit.deletions && (
                          <span className="text-green-600 dark:text-green-400">
                            +{commit.additions} <span className="text-red-600 dark:text-red-400">-{commit.deletions}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <GitCommit className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No commits in this period</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Tasks</h3>
          </div>
          <div className="card-body">
            {recentActivity?.tasks?.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.tasks.slice(0, 10).map((task: any) => (
                  <div key={task.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <CheckSquare className="h-4 w-4 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                        {task.name}
                      </p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          task.status === 'DONE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        <span>{task.list?.name}</span>
                        {task.completedAt && (
                          <span>Completed {format(new Date(task.completedAt), 'MMM d')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tasks in this period</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Performance Overview</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <GitCommit className="h-8 w-8 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                #{stats?.productivity?.rank || 'N/A'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Team Rank
              </div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <Activity className="h-8 w-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(stats?.productivity?.percentile || 0)}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Percentile
              </div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <Award className="h-8 w-8 mx-auto text-purple-600 dark:text-purple-400 mb-2" />
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {stats?.commits?.filesChanged || 0}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Files Changed
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;