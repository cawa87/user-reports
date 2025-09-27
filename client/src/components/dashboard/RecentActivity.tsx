import React from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { GitCommit, CheckSquare, User, Calendar, ArrowRight } from 'lucide-react';

interface RecentActivityProps {
  activities: Array<{
    id: string;
    type: 'commit' | 'task' | 'user';
    title: string;
    description?: string;
    user: {
      name: string;
      avatar?: string;
    };
    timestamp: string;
    link?: string;
    metadata?: any;
  }>;
  isLoading?: boolean;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ activities, isLoading }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'commit':
        return GitCommit;
      case 'task':
        return CheckSquare;
      case 'user':
      default:
        return User;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'commit':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'task':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'user':
      default:
        return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20';
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="skeleton h-6 w-32 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="skeleton h-10 w-10 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-3/4"></div>
                  <div className="skeleton h-3 w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
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
            Recent Activity
          </h3>
          <Link 
            to="/analytics"
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="space-y-4">
          {activities.slice(0, 8).map((activity) => {
            const Icon = getActivityIcon(activity.type);
            const colorClasses = getActivityColor(activity.type);
            
            const content = (
              <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                <div className={`p-2 rounded-lg ${colorClasses}`}>
                  <Icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {activity.title}
                      </h4>
                      {activity.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {activity.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-2">
                    {activity.user.avatar ? (
                      <img
                        src={activity.user.avatar}
                        alt={activity.user.name}
                        className="h-4 w-4 rounded-full"
                      />
                    ) : (
                      <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        <User className="h-2 w-2 text-gray-600 dark:text-gray-400" />
                      </div>
                    )}
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {activity.user.name}
                    </span>
                    {activity.metadata && activity.type === 'commit' && activity.metadata.projectName && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {activity.metadata.projectName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );

            return activity.link ? (
              <Link key={activity.id} to={activity.link} className="block">
                {content}
              </Link>
            ) : (
              <div key={activity.id}>
                {content}
              </div>
            );
          })}
        </div>

        {activities.length > 8 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              to="/analytics"
              className="text-sm text-center block text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              View {activities.length - 8} more activities →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;

