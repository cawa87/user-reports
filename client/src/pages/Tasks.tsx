import React, { useState } from 'react';
import { CheckSquare, RefreshCw, Grid, List, Filter, BarChart3 } from 'lucide-react';
import { useTasks, useTaskFilters, useTaskAnalytics } from '@/hooks/useTasks';
import TaskCard from '@/components/ui/TaskCard';
import TaskStats from '@/components/tasks/TaskStats';
import SyncButton from '@/components/ui/SyncButton';
import SearchInput from '@/components/ui/SearchInput';
import DateRangePicker from '@/components/ui/DateRangePicker';

const Tasks: React.FC = () => {
  const { filters, updateFilter, resetFilters } = useTaskFilters();
  const { tasks, isLoading, error, refetch } = useTasks(filters);
  const { analytics, isLoading: analyticsLoading } = useTaskAnalytics('monthly');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <CheckSquare className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to load task data
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            There was an error loading the task analytics from ClickUp.
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
          <CheckSquare className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Task Management</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {analytics.overview.totalTasks} task{analytics.overview.totalTasks !== 1 ? 's' : ''} • 
              {analytics.overview.completionRate.toFixed(1)}% completion rate
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
            showLabel={false}
            onSyncComplete={(success) => {
              if (success) {
                refetch();
              }
            }}
          />
        </div>
      </div>

      {/* Task Analytics Dashboard */}
      <TaskStats analytics={analytics} isLoading={analyticsLoading} />

      {/* Filters */}
      {showFilters && (
        <div className="animate-fadeIn">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-gray-500" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Filters
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Tasks
                  </label>
                  <SearchInput
                    value={filters.search}
                    onChange={(value) => updateFilter('search', value)}
                    placeholder="Search by name, description..."
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status || 'all'}
                    onChange={(e) => updateFilter('status', e.target.value === 'all' ? undefined : e.target.value as any)}
                    className="form-select"
                  >
                    <option value="all">All Status</option>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                    <option value="CLOSED">Closed</option>
                    <option value="ON_HOLD">On Hold</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={filters.priority || 'all'}
                    onChange={(e) => updateFilter('priority', e.target.value === 'all' ? undefined : e.target.value as any)}
                    className="form-select"
                  >
                    <option value="all">All Priorities</option>
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="NORMAL">Normal</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilter('sortBy', e.target.value as any)}
                    className="form-select"
                  >
                    <option value="updatedAt">Last Updated</option>
                    <option value="createdAt">Created Date</option>
                    <option value="name">Name</option>
                    <option value="status">Status</option>
                    <option value="priority">Priority</option>
                    <option value="dueDate">Due Date</option>
                    <option value="timeSpent">Time Spent</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Order
                  </label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => updateFilter('sortOrder', e.target.value as any)}
                    className="form-select"
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                </div>

                {/* Date Range */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date Range
                  </label>
                  <DateRangePicker
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                    onChange={(startDate, endDate) => {
                      updateFilter('startDate', startDate);
                      updateFilter('endDate', endDate);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading tasks...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No tasks found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {filters.search || filters.status || filters.priority
              ? 'Try adjusting your filters to see more tasks.'
              : 'Start by syncing data from ClickUp to see task analytics.'}
          </p>
          {(filters.search || filters.status || filters.priority) && (
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
              Showing {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </div>
            
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {analytics.overview.completionRate.toFixed(1)}% completion rate
              </span>
            </div>
          </div>
          
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {tasks.map((task: any) => (
                <TaskCard
                  key={task.id}
                  task={task}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task: any) => (
                <TaskCard
                  key={task.id}
                  task={task}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Tasks;
