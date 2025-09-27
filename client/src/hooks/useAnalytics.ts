import { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { analyticsApi } from '@/services/api';
import { subDays } from 'date-fns';

export interface AnalyticsFilters {
  period: 'weekly' | 'monthly' | 'quarterly';
  metric: 'productivity' | 'commits' | 'tasks' | 'time';
  days: number;
  userIds?: string[];
}

export const useAnalyticsOverview = (period: string = 'monthly') => {
  const {
    data: overviewResponse,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['analyticsOverview', period],
    () => analyticsApi.getOverview(period),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    }
  );

  const overview = useMemo(() => {
    return overviewResponse?.data || {
      period,
      dateRange: { startDate: subDays(new Date(), 30), endDate: new Date() },
      metrics: {
        commits: { current: 0, previous: 0, change: 0 },
        tasksCompleted: { current: 0, previous: 0, change: 0 },
        timeSpent: { current: 0, previous: 0, change: 0 },
        activeUsers: { current: 0, previous: 0, change: 0 },
      },
    };
  }, [overviewResponse?.data, period]);

  return {
    overview,
    isLoading,
    error,
    refetch,
  };
};

export const useProductivityComparison = (userIds: string[], period: string = 'monthly') => {
  const {
    data: comparisonResponse,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['productivityComparison', userIds, period],
    () => analyticsApi.getProductivityComparison(userIds, period),
    {
      enabled: userIds.length > 0,
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const comparison = useMemo(() => {
    return comparisonResponse?.data || {
      period,
      dateRange: { startDate: subDays(new Date(), 30), endDate: new Date() },
      comparisons: [],
    };
  }, [comparisonResponse?.data, period]);

  return {
    comparison,
    isLoading,
    error,
    refetch,
  };
};

export const useTeamTrends = (days: number = 30, metric: string = 'productivity') => {
  const {
    data: trendsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['teamTrends', days, metric],
    () => analyticsApi.getTeamTrends(days, metric),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );

  const trends = useMemo(() => {
    return trendsResponse?.data || {
      metric,
      days,
      trends: [],
    };
  }, [trendsResponse?.data, metric, days]);

  return {
    trends,
    isLoading,
    error,
    refetch,
  };
};

export const useProjectsPerformance = (period: string = 'monthly') => {
  const {
    data: performanceResponse,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['projectsPerformance', period],
    () => analyticsApi.getProjectsPerformance(period),
    {
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const performance = useMemo(() => {
    return performanceResponse?.data || {
      period,
      dateRange: { startDate: subDays(new Date(), 30), endDate: new Date() },
      projects: [],
      summary: {
        totalProjects: 0,
        totalCommits: 0,
        totalContributors: 0,
        avgVelocity: 0,
      },
    };
  }, [performanceResponse?.data, period]);

  return {
    performance,
    isLoading,
    error,
    refetch,
  };
};

export const useTimeBreakdown = (period: string = 'monthly', userId?: string) => {
  const {
    data: timeResponse,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['timeBreakdown', period, userId],
    () => analyticsApi.getTimeBreakdown(period, userId),
    {
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const timeBreakdown = useMemo(() => {
    return timeResponse?.data || {
      period,
      dateRange: { startDate: subDays(new Date(), 30), endDate: new Date() },
      summary: {
        totalTime: 0,
        totalSessions: 0,
        avgSessionLength: 0,
      },
      breakdown: {
        byUser: [],
        byTask: [],
        byDay: [],
      },
    };
  }, [timeResponse?.data, period, userId]);

  return {
    timeBreakdown,
    isLoading,
    error,
    refetch,
  };
};

export const useAnalyticsFilters = () => {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    period: 'monthly',
    metric: 'productivity',
    days: 30,
    userIds: [],
  });

  const updateFilter = <K extends keyof AnalyticsFilters>(
    key: K,
    value: AnalyticsFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      period: 'monthly',
      metric: 'productivity',
      days: 30,
      userIds: [],
    });
  };

  return {
    filters,
    updateFilter,
    resetFilters,
    setFilters,
  };
};

