import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, GitCommit, Clock, RefreshCw, Filter } from 'lucide-react';
import { 
  useAnalyticsOverview, 
  useTeamTrends, 
  useProjectsPerformance, 
  useTimeBreakdown,
  useAnalyticsFilters 
} from '@/hooks/useAnalytics';
import OverviewCard from '@/components/analytics/OverviewCard';
import TrendChart from '@/components/analytics/TrendChart';
import ProjectsPerformance from '@/components/analytics/ProjectsPerformance';
import SyncButton from '@/components/ui/SyncButton';

const Analytics: React.FC = () => {
  const { filters, updateFilter, resetFilters } = useAnalyticsFilters();
  const [showFilters, setShowFilters] = useState(false);

  // Fetch analytics data
  const { overview, isLoading: overviewLoading, refetch: refetchOverview } = useAnalyticsOverview(filters.period);
  const { trends, isLoading: trendsLoading } = useTeamTrends(filters.days, filters.metric);
  const { performance, isLoading: performanceLoading } = useProjectsPerformance(filters.period);
  const { timeBreakdown, isLoading: timeLoading } = useTimeBreakdown(filters.period);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTrendValue = (value: number) => {
    switch (filters.metric) {
      case 'time':
        return formatTime(value);
      case 'commits':
      case 'tasks':
      default:
        return value.toLocaleString();
    }
  };

  const handleRefreshAll = async () => {
    await Promise.all([
      refetchOverview(),
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Advanced Analytics</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Comprehensive insights into team productivity and performance
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
          >
            Filters {showFilters ? '✕' : '☰'}
          </button>
          
          <SyncButton 
            showLabel={false}
            onSyncComplete={(success) => {
              if (success) {
                handleRefreshAll();
              }
            }}
          />
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="animate-fadeIn">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-gray-500" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Analytics Filters
                  </h3>
                </div>
                
                <button
                  onClick={resetFilters}
                  className="btn btn-ghost btn-sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Period Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time Period
                  </label>
                  <select
                    value={filters.period}
                    onChange={(e) => updateFilter('period', e.target.value as any)}
                    className="form-select"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>

                {/* Metric Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Trend Metric
                  </label>
                  <select
                    value={filters.metric}
                    onChange={(e) => updateFilter('metric', e.target.value as any)}
                    className="form-select"
                  >
                    <option value="productivity">Productivity</option>
                    <option value="commits">Commits</option>
                    <option value="tasks">Tasks</option>
                    <option value="time">Time Tracking</option>
                  </select>
                </div>

                {/* Days Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Trend Days
                  </label>
                  <select
                    value={filters.days}
                    onChange={(e) => updateFilter('days', parseInt(e.target.value))}
                    className="form-select"
                  >
                    <option value={7}>7 Days</option>
                    <option value={14}>14 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                  </select>
                </div>

                {/* Period Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Period
                  </label>
                  <div className="text-sm text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                    {filters.period.charAt(0).toUpperCase() + filters.period.slice(1)} analysis
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <OverviewCard
          title="Total Commits"
          value={overview.metrics.commits.current}
          change={overview.metrics.commits.change}
          icon={GitCommit}
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-50 dark:bg-blue-900/20"
        />
        
        <OverviewCard
          title="Tasks Completed"
          value={overview.metrics.tasksCompleted.current}
          change={overview.metrics.tasksCompleted.change}
          icon={BarChart3}
          color="text-green-600 dark:text-green-400"
          bgColor="bg-green-50 dark:bg-green-900/20"
        />
        
        <OverviewCard
          title="Time Tracked"
          value={overview.metrics.timeSpent.current}
          change={overview.metrics.timeSpent.change}
          icon={Clock}
          color="text-purple-600 dark:text-purple-400"
          bgColor="bg-purple-50 dark:bg-purple-900/20"
          formatValue={formatTime}
        />
        
        <OverviewCard
          title="Active Users"
          value={overview.metrics.activeUsers.current}
          change={overview.metrics.activeUsers.change}
          icon={Users}
          color="text-orange-600 dark:text-orange-400"
          bgColor="bg-orange-50 dark:bg-orange-900/20"
        />
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart
          data={trends.trends}
          title={`${filters.metric.charAt(0).toUpperCase() + filters.metric.slice(1)} Trends`}
          color="#3B82F6"
          type="area"
          formatValue={(value) => {
            if (filters.metric === 'time') return formatTime(value);
            return value.toString();
          }}
          formatTooltip={formatTrendValue}
        />
        
        <TrendChart
          data={timeBreakdown.breakdown.byDay}
          title="Daily Time Tracking"
          color="#8B5CF6"
          type="line"
          formatValue={(value) => formatTime(value)}
          formatTooltip={formatTime}
        />
      </div>

      {/* Time Breakdown Summary */}
      {!timeLoading && timeBreakdown.summary.totalTime > 0 && (
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Time Tracking Summary
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                  {formatTime(timeBreakdown.summary.totalTime)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Time</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {timeBreakdown.summary.totalSessions}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Sessions</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                  {formatTime(timeBreakdown.summary.avgSessionLength)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Session</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects Performance */}
      <ProjectsPerformance
        performance={performance}
        isLoading={performanceLoading}
      />

      {/* Top Performers */}
      {timeBreakdown.breakdown.byUser.length > 0 && (
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Contributors by Time
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {timeBreakdown.breakdown.byUser.slice(0, 6).map((contributor, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {contributor.user?.avatar ? (
                    <img
                      src={contributor.user.avatar}
                      alt={contributor.user.name}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {contributor.user?.name || 'Unknown User'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(contributor.totalTime)} • {contributor.sessions} sessions
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
