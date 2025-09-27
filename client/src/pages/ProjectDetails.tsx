import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  FolderOpen, 
  GitBranch, 
  GitCommit, 
  Users, 
  Code, 
  FileText, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  ExternalLink,
  ArrowLeft,
  RefreshCw,
  User,
  Eye,
  EyeOff,
  Activity,
  Plus,
  Minus,
  MoreHorizontal
} from 'lucide-react';
import { projectsApi } from '@/services/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import TrendChart from '@/components/analytics/TrendChart';
import SyncButton from '@/components/ui/SyncButton';

const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [commitsPage, setCommitsPage] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  const {
    data: projectResponse,
    isLoading: projectLoading,
    error,
    refetch
  } = useQuery(
    ['project-stats', projectId, selectedPeriod],
    () => projectsApi.getStats(projectId!, selectedPeriod),
    {
      enabled: !!projectId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  const {
    data: contributorsResponse,
    isLoading: contributorsLoading
  } = useQuery(
    ['project-contributors', projectId],
    () => projectsApi.getContributors(projectId!),
    {
      enabled: !!projectId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const {
    data: commitsResponse,
    isLoading: commitsLoading
  } = useQuery(
    ['project-commits', projectId, commitsPage],
    () => projectsApi.getCommits(projectId!, { page: commitsPage, limit: 10 }),
    {
      enabled: !!projectId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  const project = projectResponse?.data?.project;
  const stats = projectResponse?.data?.stats;
  const recentCommits = projectResponse?.data?.recentCommits || [];
  const contributors = contributorsResponse?.data?.contributors || [];
  const commits = commitsResponse?.data?.commits || [];
  const pagination = commitsResponse?.data?.pagination;

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Unable to load project details
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Project not found or server connection failed.
          </p>
          <button onClick={() => refetch()} className="btn btn-primary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (projectLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="animate-pulse">
          <div className="skeleton h-8 w-64 mb-2"></div>
          <div className="skeleton h-4 w-96 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card">
                <div className="card-body">
                  <div className="skeleton h-8 w-16 mb-2"></div>
                  <div className="skeleton h-4 w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatLinesChange = (added: number, deleted: number) => {
    const net = added - deleted;
    return (
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-green-600">+{added}</span>
        <span className="text-red-600">-{deleted}</span>
        <span className={`font-medium ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ({net >= 0 ? '+' : ''}{net})
        </span>
      </div>
    );
  };

  const getVisibilityIcon = (visibility: string) => {
    return visibility === 'public' ? Eye : EyeOff;
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'text-green-600 dark:text-green-400';
      case 'internal':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'private':
      default:
        return 'text-red-600 dark:text-red-400';
    }
  };

  // Prepare chart data
  const activityChartData = stats?.activity?.dailyCommits?.map(day => ({
    date: format(new Date(day.date), 'MMM dd'),
    value: day.commits,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/projects" className="btn btn-secondary">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          
          <div>
            <div className="flex items-center space-x-3">
              <FolderOpen className="h-8 w-8 text-primary-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {project?.namespace}/{project?.name}
                </h1>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    {React.createElement(getVisibilityIcon(project?.visibility || 'private'), {
                      className: `h-4 w-4 ${getVisibilityColor(project?.visibility || 'private')}`
                    })}
                    <span className={`text-sm capitalize ${getVisibilityColor(project?.visibility || 'private')}`}>
                      {project?.visibility}
                    </span>
                  </div>
                  
                  {project?.gitlabUrl && (
                    <a
                      href={project.gitlabUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                    >
                      <span>View on GitLab</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
            
            {project?.description && (
              <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-2xl">
                {project.description}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input input-sm"
          >
            <option value="weekly">Last Week</option>
            <option value="monthly">Last Month</option>
            <option value="quarterly">Last Quarter</option>
            <option value="yearly">Last Year</option>
          </select>
          
          <SyncButton 
            showLabel={false}
            onSyncComplete={(success) => {
              if (success) {
                refetch();
              }
            }}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <GitCommit className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats?.commits?.total || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Commits</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats?.commits?.contributors || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Contributors</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <Code className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {((stats?.commits?.linesAdded || 0) - (stats?.commits?.linesDeleted || 0)).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Net Lines</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <FileText className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {stats?.commits?.filesChanged || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Files Changed</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      {activityChartData.length > 0 && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Commit Activity
              </h3>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
            
            <TrendChart
              data={activityChartData}
              title="Daily Commits"
              color="#3B82F6"
              type="area"
            />
          </div>
        </div>
      )}

      {/* Contributors & Recent Commits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Contributors */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top Contributors
              </h3>
              <Users className="h-5 w-5 text-gray-400" />
            </div>

            {contributorsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="skeleton h-10 w-10 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-3/4"></div>
                      <div className="skeleton h-3 w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {contributors.slice(0, 5).map((contributor, index) => (
                  <Link
                    key={contributor.user.id}
                    to={`/users/${contributor.user.id}`}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex-shrink-0">
                      {contributor.user.avatar ? (
                        <img
                          src={contributor.user.avatar}
                          alt={contributor.user.name}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {contributor.user.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            @{contributor.user.username}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">
                            {contributor.stats.commits} commits
                          </div>
                          {formatLinesChange(contributor.stats.linesAdded, contributor.stats.linesDeleted)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{contributor.stats.filesChanged} files changed</span>
                        <span>
                          {formatDistanceToNow(new Date(contributor.stats.lastCommit), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Commits */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Commits
              </h3>
              <GitBranch className="h-5 w-5 text-gray-400" />
            </div>

            <div className="space-y-4">
              {recentCommits.slice(0, 5).map((commit) => (
                <div
                  key={commit.id}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {commit.user?.avatar ? (
                        <img
                          src={commit.user.avatar}
                          alt={commit.user.name}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
                        {commit.message?.split('\n')[0] || 'No commit message'}
                      </h4>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <span>{commit.user?.name || commit.user?.username}</span>
                          <span>•</span>
                          <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                            {commit.sha.substring(0, 7)}
                          </code>
                        </div>
                        <span>
                          {formatDistanceToNow(new Date(commit.authorDate), { addSuffix: true })}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4 mt-2 text-xs">
                        <div className="flex items-center space-x-1 text-green-600">
                          <Plus className="h-3 w-3" />
                          <span>{commit.additions}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-red-600">
                          <Minus className="h-3 w-3" />
                          <span>{commit.deletions}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-gray-500">
                          <FileText className="h-3 w-3" />
                          <span>{commit.filesChanged} files</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Project Meta Information */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Project Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Created</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {project?.createdAt 
                  ? format(new Date(project.createdAt), 'MMM d, yyyy')
                  : 'Unknown'
                }
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Last Activity</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {project?.lastActivity 
                  ? formatDistanceToNow(new Date(project.lastActivity), { addSuffix: true })
                  : 'No recent activity'
                }
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Commits</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {project?.totalCommits?.toLocaleString() || '0'}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Repository URL</div>
              <div className="font-medium">
                {project?.gitlabUrl ? (
                  <a
                    href={project.gitlabUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                  >
                    {project.gitlabUrl.replace('https://', '')}
                  </a>
                ) : (
                  <span className="text-gray-400">Not available</span>
                )}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${project?.isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {project?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;