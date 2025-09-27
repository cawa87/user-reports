import { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { projectsApi } from '@/services/api';
import { subDays } from 'date-fns';
import { useDebounce } from './useDebounce';

export interface ProjectFilters {
  search: string;
  sortBy: 'name' | 'commits' | 'contributors' | 'linesOfCode' | 'lastActivity' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  isActive?: boolean;
  startDate: Date;
  endDate: Date;
}

export const useProjects = (filters: ProjectFilters) => {
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
  }, [debouncedSearch, filters.sortBy, filters.sortOrder, filters.isActive]);

  // Fetch projects with current filters
  const {
    data: projectsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery(
    [
      'projects', 
      page, 
      debouncedSearch, 
      filters.sortBy, 
      filters.sortOrder, 
      filters.isActive,
    ],
    () =>
      projectsApi.getAll({
        page,
        limit,
        search: debouncedSearch || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        isActive: filters.isActive,
      }),
    {
      keepPreviousData: true,
      staleTime: 30 * 1000, // 30 seconds
      enabled: true,
      refetchOnWindowFocus: false,
    }
  );

  // Projects are filtered server-side
  const projects = useMemo(() => {
    return projectsResponse?.data?.projects || [];
  }, [projectsResponse?.data?.projects]);

  // Statistics for projects
  const statistics = useMemo(() => {
    if (!projects.length) {
      return {
        totalProjects: 0,
        activeProjects: 0,
        totalCommits: 0,
        totalLinesOfCode: 0,
        totalContributors: 0,
        avgCommitsPerProject: 0,
        mostActiveProject: null,
      };
    }

    const activeProjects = projects.filter((project: any) => project.isActive).length;
    const totalCommits = projects.reduce((sum: number, project: any) => sum + project.totalCommits, 0);
    const totalLinesOfCode = projects.reduce((sum: number, project: any) => sum + (project.linesOfCode || 0), 0);
    const totalContributors = projects.reduce((sum: number, project: any) => sum + (project.totalContributors || 0), 0);
    const avgCommitsPerProject = totalCommits / projects.length;
    
    const mostActiveProject = projects.reduce((most: any, project: any) => {
      return !most || project.totalCommits > most.totalCommits ? project : most;
    }, null);

    return {
      totalProjects: projects.length,
      activeProjects,
      totalCommits,
      totalLinesOfCode,
      totalContributors,
      avgCommitsPerProject,
      mostActiveProject,
    };
  }, [projects]);

  return {
    projects,
    pagination: projectsResponse?.data?.pagination,
    statistics,
    isLoading,
    error,
    refetch,
    page,
    setPage,
  };
};

export const useProjectFilters = () => {
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    sortBy: 'lastActivity',
    sortOrder: 'desc',
    isActive: undefined,
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const updateFilter = <K extends keyof ProjectFilters>(
    key: K,
    value: ProjectFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      sortBy: 'lastActivity',
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

