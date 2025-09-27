import React from 'react';
import { X, User, GitCommit, CheckSquare, Award, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { UserFilters } from '@/hooks/useUsers';

interface FilterBadgesProps {
  filters: UserFilters;
  onRemoveFilter: (key: keyof UserFilters) => void;
  onClearAll: () => void;
}

const FilterBadges: React.FC<FilterBadgesProps> = ({
  filters,
  onRemoveFilter,
  onClearAll,
}) => {
  const activeFilters = [];

  // Search filter
  if (filters.search) {
    activeFilters.push({
      key: 'search' as keyof UserFilters,
      label: `Search: "${filters.search}"`,
      icon: User,
    });
  }

  // Date range filter
  const isDefaultDateRange = 
    Math.abs(new Date().getTime() - filters.endDate.getTime()) < 24 * 60 * 60 * 1000 &&
    Math.abs(filters.startDate.getTime() - new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime()) < 24 * 60 * 60 * 1000;
  
  if (!isDefaultDateRange) {
    activeFilters.push({
      key: 'dateRange' as keyof UserFilters,
      label: `${format(filters.startDate, 'MMM d')} - ${format(filters.endDate, 'MMM d')}`,
      icon: Calendar,
    });
  }

  // Numeric filters
  if (filters.minCommits) {
    activeFilters.push({
      key: 'minCommits' as keyof UserFilters,
      label: `${filters.minCommits}+ commits`,
      icon: GitCommit,
    });
  }

  if (filters.minTasks) {
    activeFilters.push({
      key: 'minTasks' as keyof UserFilters,
      label: `${filters.minTasks}+ tasks`,
      icon: CheckSquare,
    });
  }

  if (filters.minProductivity) {
    activeFilters.push({
      key: 'minProductivity' as keyof UserFilters,
      label: `${filters.minProductivity}+ score`,
      icon: Award,
    });
  }

  // Active status filter
  if (filters.isActive !== undefined) {
    activeFilters.push({
      key: 'isActive' as keyof UserFilters,
      label: filters.isActive ? 'Active only' : 'Inactive only',
      icon: User,
    });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  const handleRemoveFilter = (key: keyof UserFilters) => {
    if (key === 'dateRange') {
      // Reset to default date range
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      onRemoveFilter('startDate');
      onRemoveFilter('endDate');
    } else {
      onRemoveFilter(key);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Active filters:
      </span>
      
      {activeFilters.map((filter) => {
        const Icon = filter.icon;
        return (
          <span
            key={filter.key}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 border border-primary-200 dark:border-primary-700"
          >
            <Icon className="h-3 w-3 mr-1.5" />
            {filter.label}
            <button
              onClick={() => handleRemoveFilter(filter.key)}
              className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        );
      })}
      
      {activeFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
};

export default FilterBadges;
