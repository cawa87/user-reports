import { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { usersApi } from '@/services/api';
import { subDays } from 'date-fns';
import { useDebounce } from './useDebounce';

export interface UserFilters {
  search: string;
  sortBy: 'name' | 'commits' | 'tasks' | 'timeSpent' | 'productivity' | 'lastSeen';
  sortOrder: 'asc' | 'desc';
  isActive?: boolean;
  startDate: Date;
  endDate: Date;
  minCommits?: number;
  minTasks?: number;
  minProductivity?: number;
}

export const useUsers = (filters: UserFilters) => {
  const [page, setPage] = useState(1);
  const limit = 20;

  // Debounce search and numeric filters for smoother UX
  const debouncedSearch = useDebounce(filters.search, 300);
  const debouncedMinCommits = useDebounce(filters.minCommits, 500);
  const debouncedMinTasks = useDebounce(filters.minTasks, 500);
  const debouncedMinProductivity = useDebounce(filters.minProductivity, 500);

  // Reset page when filters change (with debounce to prevent excessive resets)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 100); // Small delay to prevent rapid page resets
    
    return () => clearTimeout(timer);
  }, [debouncedSearch, filters.sortBy, filters.sortOrder, filters.isActive, filters.startDate, filters.endDate, debouncedMinCommits, debouncedMinTasks, debouncedMinProductivity]);

  // Fetch users with current filters
  const {
    data: usersResponse,
    isLoading,
    error,
    refetch,
  } = useQuery(
    [
      'users', 
      page, 
      debouncedSearch, 
      filters.sortBy, 
      filters.sortOrder, 
      filters.isActive,
      filters.startDate.toISOString(),
      filters.endDate.toISOString(),
      debouncedMinCommits,
      debouncedMinTasks,
      debouncedMinProductivity,
    ],
    () =>
      usersApi.getAll({
        page,
        limit,
        search: debouncedSearch || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        isActive: filters.isActive,
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
        minCommits: debouncedMinCommits,
        minTasks: debouncedMinTasks,
        minProductivity: debouncedMinProductivity,
      }),
    {
      keepPreviousData: true, // Keep previous data to prevent UI jumps
      staleTime: 30 * 1000, // 30 seconds
      enabled: true,
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
    }
  );

  // Users are now filtered server-side, so just use the response directly
  const filteredUsers = useMemo(() => {
    return usersResponse?.data?.users || [];
  }, [usersResponse?.data?.users]);

  // Statistics for filtered users
  const statistics = useMemo(() => {
    if (!filteredUsers.length) {
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalCommits: 0,
        totalLinesAdded: 0,
        totalLinesDeleted: 0,
        totalTasks: 0,
        totalTimeSpent: 0,
        avgProductivity: 0,
        topPerformer: null,
      };
    }

    const activeUsers = filteredUsers.filter((user: any) => user.isActive).length;
    const totalCommits = filteredUsers.reduce((sum: number, user: any) => sum + user.totalCommits, 0);
    const totalLinesAdded = filteredUsers.reduce((sum: number, user: any) => sum + (user.totalLinesAdded || 0), 0);
    const totalLinesDeleted = filteredUsers.reduce((sum: number, user: any) => sum + (user.totalLinesDeleted || 0), 0);
    const totalTasks = filteredUsers.reduce((sum: number, user: any) => sum + user.totalTasksCompleted, 0);
    const totalTimeSpent = filteredUsers.reduce((sum: number, user: any) => sum + user.totalTimeSpent, 0);
    const avgProductivity = filteredUsers.reduce((sum: number, user: any) => sum + user.productivityScore, 0) / filteredUsers.length;
    
    const topPerformer = filteredUsers.reduce((top: any, user: any) => {
      return !top || user.productivityScore > top.productivityScore ? user : top;
    }, null);

    return {
      totalUsers: filteredUsers.length,
      activeUsers,
      totalCommits,
      totalLinesAdded,
      totalLinesDeleted,
      totalTasks,
      totalTimeSpent,
      avgProductivity,
      topPerformer,
    };
  }, [filteredUsers]);

  return {
    users: filteredUsers,
    pagination: usersResponse?.data?.pagination,
    statistics,
    isLoading,
    error,
    refetch,
    page,
    setPage,
  };
};

export const useUserFilters = () => {
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    sortBy: 'productivity',
    sortOrder: 'desc',
    isActive: undefined,
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const updateFilter = <K extends keyof UserFilters>(
    key: K,
    value: UserFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      sortBy: 'productivity',
      sortOrder: 'desc',
      isActive: undefined,
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
