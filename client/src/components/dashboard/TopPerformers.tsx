import React from 'react';
import { Link } from 'react-router-dom';
import { User, Trophy, GitCommit, CheckSquare, Clock, ArrowRight } from 'lucide-react';

interface TopPerformersProps {
  performers: Array<{
    user: {
      id: string;
      name: string;
      username: string;
      avatar?: string;
    };
    metrics: {
      commits: number;
      tasksCompleted: number;
      timeSpent: number;
      productivityScore: number;
    };
    rank: number;
  }>;
  isLoading?: boolean;
}

const TopPerformers: React.FC<TopPerformersProps> = ({ performers, isLoading }) => {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Trophy className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Trophy className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="h-5 w-5 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-400">#{rank}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="skeleton h-6 w-32 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="skeleton h-10 w-10 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-3/4"></div>
                  <div className="skeleton h-3 w-1/2"></div>
                </div>
                <div className="skeleton h-6 w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (performers.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Performers
          </h3>
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No performance data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Top Performers
          </h3>
          <Link 
            to="/users"
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="space-y-4">
          {performers.slice(0, 5).map((performer, index) => (
            <Link
              key={performer.user.id}
              to={`/users/${performer.user.id}`}
              className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
            >
              <div className="flex-shrink-0">
                {getRankIcon(performer.rank)}
              </div>

              <div className="flex-shrink-0">
                {performer.user.avatar ? (
                  <img
                    src={performer.user.avatar}
                    alt={performer.user.name}
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
                      {performer.user.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      @{performer.user.username}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                      {performer.metrics.productivityScore}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Score
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <GitCommit className="h-3 w-3" />
                      <span>{performer.metrics.commits}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CheckSquare className="h-3 w-3" />
                      <span>{performer.metrics.tasksCompleted}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(performer.metrics.timeSpent)}</span>
                    </div>
                  </div>
                  
                  <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {performers.length > 5 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              to="/users"
              className="text-sm text-center block text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              View all {performers.length} team members →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopPerformers;

