import React from 'react';
import { 
  FolderOpen, 
  GitCommit, 
  Users, 
  Code, 
  Activity,
  TrendingUp,
  Award
} from 'lucide-react';

interface ProjectStatsProps {
  statistics: {
    totalProjects: number;
    activeProjects: number;
    totalCommits: number;
    totalLinesOfCode: number;
    totalContributors: number;
    avgCommitsPerProject: number;
    mostActiveProject: any;
  };
  isLoading?: boolean;
}

const ProjectStats: React.FC<ProjectStatsProps> = ({ statistics, isLoading }) => {
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
      title: 'Total Projects',
      value: statistics.totalProjects.toLocaleString(),
      subtitle: `${statistics.activeProjects} active`,
      icon: FolderOpen,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Total Commits',
      value: statistics.totalCommits.toLocaleString(),
      subtitle: `${Math.round(statistics.avgCommitsPerProject)} avg per project`,
      icon: GitCommit,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Contributors',
      value: statistics.totalContributors.toLocaleString(),
      subtitle: `Across all projects`,
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'Lines of Code',
      value: statistics.totalLinesOfCode > 1000 
        ? `${(statistics.totalLinesOfCode / 1000).toFixed(1)}K`
        : statistics.totalLinesOfCode.toLocaleString(),
      subtitle: 'Total codebase',
      icon: Code,
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

      {/* Most Active Project Highlight */}
      {statistics.mostActiveProject && (
        <div className="card bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-primary-200 dark:border-primary-700">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg">
                  <Award className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Most Active Project
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Leading the development activity
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
                  {statistics.mostActiveProject.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-end space-x-4 mt-1">
                  <span className="flex items-center">
                    <GitCommit className="h-3 w-3 mr-1" />
                    {statistics.mostActiveProject.totalCommits.toLocaleString()} commits
                  </span>
                  {statistics.mostActiveProject.totalContributors > 0 && (
                    <span className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {statistics.mostActiveProject.totalContributors} contributors
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectStats;

