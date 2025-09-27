import React from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  GitBranch, 
  Users, 
  GitCommit, 
  Code, 
  ExternalLink,
  Calendar,
  Activity,
  Plus,
  Minus,
  FileText
} from 'lucide-react';

interface ProjectCardProps {
  project: {
    id: number;
    name: string;
    description?: string;
    namespace?: string;
    visibility?: string;
    gitlabUrl?: string;
    isActive: boolean;
    totalCommits: number;
    totalContributors?: number;
    linesOfCode?: number;
    lastActivity: string;
    createdAt: string;
    recentActivity?: {
      commits: number;
      contributors: number;
      linesAdded: number;
      linesDeleted: number;
      filesChanged: number;
    };
  };
  period?: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, period = 'last 30 days' }) => {
  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility?.toLowerCase()) {
      case 'public':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'private':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'internal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const netLinesChanged = (project.recentActivity?.linesAdded || 0) - (project.recentActivity?.linesDeleted || 0);

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="card-body">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <GitBranch className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <Link
                to={`/projects/${project.id}`}
                className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
              >
                {project.namespace ? `${project.namespace}/` : ''}{project.name}
              </Link>
            </div>
            
            {project.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                {project.description}
              </p>
            )}
            
            <div className="flex items-center space-x-2">
              {project.visibility && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getVisibilityColor(project.visibility)}`}>
                  {project.visibility}
                </span>
              )}
              
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                project.isActive 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {project.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="flex space-x-2 ml-4">
            {project.gitlabUrl && (
              <a
                href={project.gitlabUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                title="View on GitLab"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <GitCommit className="h-5 w-5 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {project.totalCommits.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Total Commits
            </div>
          </div>

          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Users className="h-5 w-5 mx-auto text-green-600 dark:text-green-400 mb-1" />
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {(project.totalContributors || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Contributors
            </div>
          </div>

          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Code className="h-5 w-5 mx-auto text-purple-600 dark:text-purple-400 mb-1" />
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {(project.linesOfCode || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Lines of Code
            </div>
          </div>

          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Activity className="h-5 w-5 mx-auto text-orange-600 dark:text-orange-400 mb-1" />
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatTime(project.lastActivity)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Last Activity
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {project.recentActivity && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Recent Activity ({period})
            </h4>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Commits:</span>
                <span className="font-medium">{project.recentActivity.commits}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Contributors:</span>
                <span className="font-medium">{project.recentActivity.contributors}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Files:</span>
                <span className="font-medium">{project.recentActivity.filesChanged}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Net Lines:</span>
                <span className={`font-medium ${
                  netLinesChanged >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {netLinesChanged >= 0 ? '+' : ''}{netLinesChanged.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-between text-xs mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-green-600 dark:text-green-400 flex items-center">
                <Plus className="h-3 w-3 mr-1" />
                +{project.recentActivity.linesAdded.toLocaleString()}
              </span>
              <span className="text-red-600 dark:text-red-400 flex items-center">
                <Minus className="h-3 w-3 mr-1" />
                -{project.recentActivity.linesDeleted.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            Created {format(new Date(project.createdAt), 'MMM d, yyyy')}
          </div>
          
          <Link
            to={`/projects/${project.id}`}
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            View Details →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;

