import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { dashboardApi, analyticsApi, usersApi } from '@/services/api';
import { useAnalyticsOverview } from './useAnalytics';

export const useDashboardOverview = () => {
  const { data: dashboardResponse, isLoading: dashboardLoading, error } = useQuery(
    'dashboard-overview',
    dashboardApi.getOverview,
    {
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  // Also get analytics overview for trend data
  const { overview: analyticsOverview } = useAnalyticsOverview('monthly');

  const overview = useMemo(() => {
    const stats = dashboardResponse?.data?.overview || {};
    const analytics = analyticsOverview?.metrics || {};
    
    return {
      totalCommits: stats.totalCommits || 0,
      completedTasks: stats.completedTasks || 0,
      activeUsers: stats.activeUsers || 0,
      totalProjects: stats.totalProjects || 0,
      // Include trend data from analytics
      commitTrend: analytics.commits?.change || 0,
      taskTrend: analytics.tasksCompleted?.change || 0,
      userTrend: analytics.activeUsers?.change || 0,
      projectTrend: 0, // Can be calculated if needed
    };
  }, [dashboardResponse?.data?.overview, analyticsOverview?.metrics]);

  return {
    overview,
    isLoading: dashboardLoading,
    error,
  };
};

export const useDashboardRecentActivity = () => {
  const { data: activityResponse, isLoading } = useQuery(
    'dashboard-recent-activity',
    () => dashboardApi.getRecentActivity(),
    {
      refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
      staleTime: 1 * 60 * 1000, // 1 minute
    }
  );

  const activities = useMemo(() => {
    return activityResponse?.data?.activities || [];
  }, [activityResponse?.data?.activities]);

  return {
    activities,
    isLoading,
  };
};

export const useDashboardTopPerformers = () => {
  const { data: usersResponse, isLoading } = useQuery(
    ['dashboard-top-performers'],
    () => usersApi.getAll({
      limit: 10,
      sortBy: 'productivityScore',
      sortOrder: 'desc',
      isActive: true,
    }),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const performers = useMemo(() => {
    const users = usersResponse?.data?.users || [];
    return users.map((user: any, index: number) => ({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
      },
      metrics: {
        commits: user.totalCommits || 0,
        tasksCompleted: user.totalTasksCompleted || 0,
        timeSpent: user.totalTimeSpent || 0,
        productivityScore: user.productivityScore || 0,
      },
      rank: index + 1,
    }));
  }, [usersResponse?.data?.users]);

  return {
    performers,
    isLoading,
  };
};

