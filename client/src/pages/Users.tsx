import React from 'react';
import { Users as UsersIcon, UserPlus, RefreshCw, Grid, List } from 'lucide-react';
import { useUsers, useUserFilters } from '@/hooks/useUsers';
import UserCard from '@/components/ui/UserCard';
import UserFilters from '@/components/users/UserFilters';
import UserStats from '@/components/users/UserStats';
import SyncButton from '@/components/ui/SyncButton';
import FilterBadges from '@/components/ui/FilterBadges';

const Users: React.FC = () => {
  const { filters, updateFilter, resetFilters } = useUserFilters();
  const { users, statistics, isLoading, error, refetch } = useUsers(filters);
  
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = React.useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <UsersIcon className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Analytics</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Team performance and statistics</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center space-x-2 text-gray-500">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading user analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <UsersIcon className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Analytics</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Team performance and statistics</p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <UsersIcon className="h-12 w-12 mx-auto opacity-50" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to load user data
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            There was an error loading the user analytics.
          </p>
          <button
            onClick={() => refetch()}
            className="btn btn-primary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
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
          <UsersIcon className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Analytics</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {statistics.totalUsers} team member{statistics.totalUsers !== 1 ? 's' : ''} • 
              {statistics.activeUsers} active
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
          
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          
          <SyncButton 
            size="sm" 
            showLabel={true}
            onSyncComplete={(success) => {
              if (success) {
                refetch();
              }
            }}
            className="mr-3"
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

      {/* Statistics Overview */}
      <UserStats statistics={statistics} isLoading={isLoading} />

      {/* Filters */}
      {showFilters && (
        <div className="animate-fadeIn">
          <UserFilters
            filters={filters}
            onFilterChange={updateFilter}
            onReset={resetFilters}
          />
        </div>
      )}

      {/* Active Filter Badges */}
      <FilterBadges
        filters={filters}
        onRemoveFilter={(key) => {
          if (key === 'startDate' || key === 'endDate') {
            // Reset date range to default
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            updateFilter('startDate', thirtyDaysAgo);
            updateFilter('endDate', new Date());
          } else {
            updateFilter(key, key === 'search' ? '' : undefined);
          }
        }}
        onClearAll={resetFilters}
      />

      {/* Users List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading users...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <UsersIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No users found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {filters.search || filters.minCommits || filters.minTasks || filters.minProductivity
              ? 'Try adjusting your filters to see more users.'
              : 'Start by syncing data from GitLab and ClickUp to see user statistics.'}
          </p>
          {(filters.search || filters.minCommits || filters.minTasks || filters.minProductivity) && (
            <button
              onClick={resetFilters}
              className="btn btn-secondary mr-3"
            >
              Clear Filters
            </button>
          )}
          <SyncButton 
            showLabel={true}
            onSyncComplete={(success) => {
              if (success) {
                refetch();
              }
            }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {users.length} of {statistics.totalUsers} users
            </div>
          </div>
          
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((user: any) => (
                <UserCard
                  key={user.id}
                  user={user}
                  period={`${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user: any) => (
                <UserCard
                  key={user.id}
                  user={user}
                  period={`${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Users;
