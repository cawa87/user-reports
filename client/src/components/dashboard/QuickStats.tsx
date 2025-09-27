import React from 'react';
import { Link } from 'react-router-dom';
import { GitCommit, CheckSquare, Users, FolderOpen, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';

interface QuickStatsProps {
  stats: {
    totalCommits: number;
    completedTasks: number;
    activeUsers: number;
    totalProjects: number;
    commitTrend: number;
    taskTrend: number;
    userTrend: number;
    projectTrend: number;
  };
  isLoading?: boolean;
}

const QuickStats: React.FC<QuickStatsProps> = ({ stats, isLoading }) => {
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return TrendingUp;
    if (trend < 0) return TrendingDown;
    return Minus;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600 dark:text-green-400';
    if (trend < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const statCards = [
    {
      title: 'Total Commits',
      value: stats.totalCommits,
      trend: stats.commitTrend,
      icon: GitCommit,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      link: '/analytics',
      subtitle: 'GitLab Activity',
    },
    {
      title: 'Completed Tasks',
      value: stats.completedTasks,
      trend: stats.taskTrend,
      icon: CheckSquare,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      link: '/tasks',
      subtitle: 'ClickUp Progress',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      trend: stats.userTrend,
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      link: '/users',
      subtitle: 'Team Members',
    },
    {
      title: 'Projects',
      value: stats.totalProjects,
      trend: stats.projectTrend,
      icon: FolderOpen,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      link: '/projects',
      subtitle: 'Repositories',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="skeleton h-8 w-8 rounded-lg"></div>
              <div className="skeleton h-8 w-16"></div>
            </div>
            <div className="skeleton h-4 w-20 mb-2"></div>
            <div className="skeleton h-3 w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        const TrendIcon = getTrendIcon(stat.trend);
        
        return (
          <Link 
            key={index} 
            to={stat.link}
            className={`stat-card ${stat.bgColor} border-0 hover:shadow-lg transition-all duration-200 group cursor-pointer`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bgColor.replace(/\/20$/, '/40')} group-hover:scale-105 transition-transform`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className={`text-3xl font-bold ${stat.color} group-hover:scale-105 transition-transform`}>
                {stat.value.toLocaleString()}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {stat.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stat.subtitle}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1 ${getTrendColor(stat.trend)}`}>
                  <TrendIcon className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    {Math.abs(stat.trend).toFixed(1)}%
                  </span>
                </div>
                <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default QuickStats;

