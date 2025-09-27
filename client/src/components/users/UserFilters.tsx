import React, { memo } from 'react';
import { Filter, RotateCcw, Users, UserCheck, Star } from 'lucide-react';
import AutocompleteInput from '@/components/ui/AutocompleteInput';
import DateRangePicker from '@/components/ui/DateRangePicker';
import { UserFilters as UserFiltersType } from '@/hooks/useUsers';
import { useUserAutocomplete } from '@/hooks/useAutocomplete';

interface UserFiltersProps {
  filters: UserFiltersType;
  onFilterChange: <K extends keyof UserFiltersType>(key: K, value: UserFiltersType[K]) => void;
  onReset: () => void;
}

const UserFilters: React.FC<UserFiltersProps> = memo(({
  filters,
  onFilterChange,
  onReset,
}) => {
  const { suggestions, isLoading } = useUserAutocomplete(filters.search);

  return (
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
            onClick={onReset}
            className="btn btn-ghost btn-sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Search with Autocomplete */}
          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Users
            </label>
            <AutocompleteInput
              value={filters.search}
              onChange={(value) => onFilterChange('search', value)}
              suggestions={suggestions}
              isLoading={isLoading}
              placeholder="Search by name, username, email..."
              onSuggestionSelect={(suggestion) => {
                // Clear other filters when selecting from autocomplete
                onFilterChange('search', suggestion.name);
              }}
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Range
            </label>
            <DateRangePicker
              startDate={filters.startDate}
              endDate={filters.endDate}
              onDateChange={(start, end) => {
                onFilterChange('startDate', start);
                onFilterChange('endDate', end);
              }}
            />
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange('sortBy', e.target.value as any)}
              className="form-select"
            >
              <option value="productivity">Productivity Score</option>
              <option value="commits">Total Commits</option>
              <option value="tasks">Tasks Completed</option>
              <option value="timeSpent">Time Spent</option>
              <option value="name">Name</option>
              <option value="lastSeen">Last Seen</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Order
            </label>
            <select
              value={filters.sortOrder}
              onChange={(e) => onFilterChange('sortOrder', e.target.value as any)}
              className="form-select"
            >
              <option value="desc">Highest First</option>
              <option value="asc">Lowest First</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Advanced Filters
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
                onChange={(e) => {
                  const value = e.target.value;
                  onFilterChange('isActive', value === 'all' ? undefined : value === 'active');
                }}
                className="form-select"
              >
                <option value="all">All Users</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Minimum Commits */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min. Commits
              </label>
              <input
                type="number"
                value={filters.minCommits || ''}
                onChange={(e) => onFilterChange('minCommits', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Any"
                min="0"
                className="form-input"
              />
            </div>

            {/* Minimum Tasks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min. Tasks
              </label>
              <input
                type="number"
                value={filters.minTasks || ''}
                onChange={(e) => onFilterChange('minTasks', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Any"
                min="0"
                className="form-input"
              />
            </div>

            {/* Minimum Productivity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min. Productivity
              </label>
              <input
                type="number"
                value={filters.minProductivity || ''}
                onChange={(e) => onFilterChange('minProductivity', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Any"
                min="0"
                max="100"
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => onFilterChange('minProductivity', 80)}
            className="btn btn-ghost btn-sm"
          >
            <Star className="h-4 w-4 mr-1" />
            Top Performers (80%+)
          </button>
          
          <button
            onClick={() => onFilterChange('isActive', true)}
            className="btn btn-ghost btn-sm"
          >
            <UserCheck className="h-4 w-4 mr-1" />
            Active Users Only
          </button>
          
          <button
            onClick={() => {
              onFilterChange('minCommits', 10);
              onFilterChange('minTasks', 5);
            }}
            className="btn btn-ghost btn-sm"
          >
            <Users className="h-4 w-4 mr-1" />
            Active Contributors
          </button>
        </div>
      </div>
    </div>
  );
});

UserFilters.displayName = 'UserFilters';

export default UserFilters;
