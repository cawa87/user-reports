import { useQuery } from 'react-query';
import { projectsApi } from '@/services/api';

export const useProjectDetails = (projectId: string, period: string = 'monthly') => {
  const {
    data: projectResponse,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['project-details', projectId, period],
    () => projectsApi.getStats(projectId, period),
    {
      enabled: !!projectId,
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: false,
    }
  );

  return {
    project: projectResponse?.data?.project,
    stats: projectResponse?.data?.stats,
    recentCommits: projectResponse?.data?.recentCommits || [],
    codeStats: projectResponse?.data?.codeStats || [],
    isLoading,
    error,
    refetch,
  };
};

export const useProjectContributors = (projectId: string) => {
  const {
    data: contributorsResponse,
    isLoading,
    error,
  } = useQuery(
    ['project-contributors', projectId],
    () => projectsApi.getContributors(projectId),
    {
      enabled: !!projectId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );

  return {
    contributors: contributorsResponse?.data?.contributors || [],
    summary: contributorsResponse?.data?.summary,
    isLoading,
    error,
  };
};

export const useProjectCommits = (projectId: string, page: number = 1, limit: number = 10) => {
  const {
    data: commitsResponse,
    isLoading,
    error,
  } = useQuery(
    ['project-commits', projectId, page, limit],
    () => projectsApi.getCommits(projectId, { page, limit }),
    {
      enabled: !!projectId,
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: false,
      keepPreviousData: true,
    }
  );

  return {
    commits: commitsResponse?.data?.commits || [],
    pagination: commitsResponse?.data?.pagination,
    isLoading,
    error,
  };
};

