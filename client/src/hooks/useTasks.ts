import { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { tasksApi } from '@/services/api';
import { subDays } from 'date-fns';
import { useDebounce } from './useDebounce';

export interface TaskFilters {
  search: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CLOSED' | 'ON_HOLD';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  assigneeId?: string;
  spaceId?: string;
  sortBy: 'name' | 'status' | 'priority' | 'dueDate' | 'timeSpent' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  startDate: Date;
  endDate: Date;
}

export const useTasks = (filters: TaskFilters) => {
  const [page, setPage] = useState(1);
  const limit = 20;

  // Debounce search for smoother UX
  const debouncedSearch = useDebounce(filters.search, 300);

  // Reset page when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [debouncedSearch, filters.status, filters.priority, filters.assigneeId, filters.spaceId, filters.sortBy, filters.sortOrder, filters.startDate, filters.endDate]);

  // Fetch tasks with current filters
  const {
    data: tasksResponse,
    isLoading,
    error,
    refetch,
  } = useQuery(
    [
      'tasks', 
      page, 
      debouncedSearch,
      filters.status,
      filters.priority,
      filters.assigneeId,
      filters.spaceId,
      filters.sortBy, 
      filters.sortOrder,
      filters.startDate.toISOString(),
      filters.endDate.toISOString(),
    ],
    () =>
      tasksApi.getAll({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: filters.status,
        priority: filters.priority,
        assigneeId: filters.assigneeId,
        spaceId: filters.spaceId,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
      }),
    {
      keepPreviousData: true,
      staleTime: 30 * 1000, // 30 seconds
      enabled: true,
      refetchOnWindowFocus: false,
    }
  );

  // Tasks are filtered server-side
  const tasks = useMemo(() => {
    return tasksResponse?.data?.tasks || [];
  }, [tasksResponse?.data?.tasks]);

  return {
    tasks,
    pagination: tasksResponse?.data?.pagination,
    isLoading,
    error,
    refetch,
    page,
    setPage,
  };
};

export const useTaskAnalytics = (period: string = 'monthly', spaceId?: string) => {
  const {
    data: analyticsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['taskAnalytics', period, spaceId],
    () => tasksApi.getAnalytics({ period, spaceId }),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );

  const analytics = useMemo(() => {
    return analyticsResponse?.data || {
      overview: {
        totalTasks: 0,
        completedTasks: 0,
        completionRate: 0,
        overdueTasks: 0,
        totalTimeSpent: 0,
        avgCompletionTime: 0,
        avgCompletionDays: 0,
        taskVelocity: 0,
      },
      breakdown: {
        byStatus: [],
        byPriority: [],
      },
      trends: {
        dailyCompletions: [],
        topPerformers: [],
      },
    };
  }, [analyticsResponse?.data]);

  return {
    analytics,
    isLoading,
    error,
    refetch,
  };
};

export const useTaskFilters = () => {
  const [filters, setFilters] = useState<TaskFilters>({
    search: '',
    status: undefined,
    priority: undefined,
    assigneeId: undefined,
    spaceId: undefined,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const updateFilter = <K extends keyof TaskFilters>(
    key: K,
    value: TaskFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: undefined,
      priority: undefined,
      assigneeId: undefined,
      spaceId: undefined,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
    });
  };

  return {
    filters,
    updateFilter,
    resetFilters,
    setFilters,
  };
};

