import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { LayoutDashboard, RefreshCw, ArrowRight, Zap } from 'lucide-react';
import QuickStats from '@/components/dashboard/QuickStats';
import RecentActivity from '@/components/dashboard/RecentActivity';
import TopPerformers from '@/components/dashboard/TopPerformers';
import SyncButton from '@/components/ui/SyncButton';
import { 
  useDashboardOverview, 
  useDashboardRecentActivity,
  useDashboardTopPerformers 
} from '@/hooks/useDashboard';

const Dashboard: React.FC = () => {
  const { overview, isLoading: overviewLoading, error } = useDashboardOverview();
  const { activities, isLoading: activityLoading } = useDashboardRecentActivity();
  const { performers, isLoading: performersLoading } = useDashboardTopPerformers();

  const handleRefreshAll = async () => {
    // Refresh all data
    window.location.reload();
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <LayoutDashboard className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Unable to load dashboard
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Please check your server connection and try again.
          </p>
          <button
            onClick={handleRefreshAll}
            className="btn btn-primary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <LayoutDashboard className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Executive overview • Updated {format(new Date(), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <SyncButton 
            showLabel={false}
            onSyncComplete={(success) => {
              if (success) {
                setTimeout(handleRefreshAll, 2000); // Refresh after sync
              }
            }}
          />
        </div>
      </div>

      {/* Quick Stats Overview */}
      <QuickStats stats={overview} isLoading={overviewLoading} />

      {/* Performance Highlights */}
      <div className="card bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-primary-200 dark:border-primary-700">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg">
                <Zap className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Performance Overview
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your team's productivity at a glance
                </p>
              </div>
            </div>
            
            <Link 
              to="/analytics"
              className="btn btn-primary"
            >
              View Analytics
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                {overview.commitTrend >= 0 ? '+' : ''}{overview.commitTrend.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Commit Growth</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">vs last period</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                {overview.taskTrend >= 0 ? '+' : ''}{overview.taskTrend.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Task Completion</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">vs last period</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {overview.userTrend >= 0 ? '+' : ''}{overview.userTrend.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">User Activity</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">vs last period</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <RecentActivity activities={activities} isLoading={activityLoading} />
        </div>

        {/* Top Performers */}
        <div className="lg:col-span-1">
          <TopPerformers performers={performers} isLoading={performersLoading} />
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/users" className="card hover:shadow-lg transition-shadow group">
          <div className="card-body text-center">
            <div className="text-3xl mb-2">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              Team Analytics
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Individual performance tracking and productivity insights
            </p>
            <div className="flex items-center justify-center mt-4 text-primary-600 dark:text-primary-400">
              <span className="text-sm">View Details</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </div>
        </Link>

        <Link to="/projects" className="card hover:shadow-lg transition-shadow group">
          <div className="card-body text-center">
            <div className="text-3xl mb-2">📁</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              Project Metrics
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              GitLab repository analytics, commits, and contributor insights
            </p>
            <div className="flex items-center justify-center mt-4 text-primary-600 dark:text-primary-400">
              <span className="text-sm">View Details</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </div>
        </Link>

        <Link to="/tasks" className="card hover:shadow-lg transition-shadow group">
          <div className="card-body text-center">
            <div className="text-3xl mb-2">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              Task Management
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              ClickUp task tracking, completion rates, and team productivity
            </p>
            <div className="flex items-center justify-center mt-4 text-primary-600 dark:text-primary-400">
              <span className="text-sm">View Details</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </div>
        </Link>

        <Link to="/analytics" className="card hover:shadow-lg transition-shadow group">
          <div className="card-body text-center">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              Advanced Analytics
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Comprehensive reporting, trends, and business intelligence
            </p>
            <div className="flex items-center justify-center mt-4 text-primary-600 dark:text-primary-400">
              <span className="text-sm">View Details</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
