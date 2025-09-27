import axios, { AxiosInstance, AxiosError } from 'axios';
import toast from 'react-hot-toast';

// Create API client instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: (import.meta.env as any)?.VITE_API_URL || '/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed in the future
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle common errors
    if (error.response?.status === 404) {
      // Don't show toast for 404 errors, let components handle them
      return Promise.reject(error);
    }

    if (error.response?.status === 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      toast.error('Network error. Please check your connection.');
    } else if (error.response?.status === 429) {
      toast.error('Too many requests. Please wait a moment.');
    } else if (error.response?.status >= 400 && error.response?.status < 500) {
      const message = error.response.data?.error || 'Something went wrong';
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// API service functions
export const dashboardApi = {
  getOverview: () => apiClient.get('/dashboard'),
  getTrends: (days: number = 30) => apiClient.get(`/dashboard/trends?days=${days}`),
  getRecentActivity: (params: { limit?: number; days?: number } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    return apiClient.get(`/dashboard/recent-activity?${searchParams.toString()}`);
  },
  getLeaderboard: (period: string = 'monthly', limit: number = 10) => 
    apiClient.get(`/dashboard/leaderboard?period=${period}&limit=${limit}`),
  getActivity: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiClient.get(`/dashboard/activity?${params.toString()}`);
  },
};

export const usersApi = {
  getAll: (params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
    minCommits?: number;
    minTasks?: number;
    minProductivity?: number;
  } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    return apiClient.get(`/users?${searchParams.toString()}`);
  },

  getSuggestions: (query: string, limit?: number) => {
    const params = new URLSearchParams();
    params.append('q', query);
    if (limit) params.append('limit', limit.toString());
    return apiClient.get(`/users/suggestions?${params.toString()}`);
  },
  
  getById: (userId: string, params?: { startDate?: Date; endDate?: Date }) => {
    // Use the period parameter based on date range
    let period = 'monthly';
    if (params?.startDate && params?.endDate) {
      const daysDiff = Math.ceil((params.endDate.getTime() - params.startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 7) period = 'weekly';
      else if (daysDiff <= 30) period = 'monthly';
      else if (daysDiff <= 90) period = 'quarterly';
      else period = 'yearly';
    }
    return apiClient.get(`/users/${userId}/stats?period=${period}`);
  },

  getStats: (userId: string, period?: string) => {
    const params = period ? `?period=${period}` : '';
    return apiClient.get(`/users/${userId}/stats${params}`);
  },
  
  getTrends: (userId: string, days: number = 30) =>
    apiClient.get(`/users/${userId}/trends?days=${days}`),
  
  getCommits: (userId: string, params: {
    page?: number;
    limit?: number;
    projectId?: number;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    return apiClient.get(`/users/${userId}/commits?${searchParams.toString()}`);
  },
  
  getTasks: (userId: string, params: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    return apiClient.get(`/users/${userId}/tasks?${searchParams.toString()}`);
  },
  
  getTime: (userId: string, params: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    return apiClient.get(`/users/${userId}/time?${searchParams.toString()}`);
  },
};

export const projectsApi = {
  getAll: (params: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    return apiClient.get(`/projects?${searchParams.toString()}`);
  },
  
  getStats: (projectId: string, period?: string) => {
    const params = period ? `?period=${period}` : '';
    return apiClient.get(`/projects/${projectId}/stats${params}`);
  },
  
  getContributors: (projectId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiClient.get(`/projects/${projectId}/contributors?${params.toString()}`);
  },
  
  getCommits: (projectId: string, params: {
    page?: number;
    limit?: number;
    userId?: string;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    return apiClient.get(`/projects/${projectId}/commits?${searchParams.toString()}`);
  },
};

export const tasksApi = {
  getAll: (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    spaceId?: string;
    sortBy?: string;
    sortOrder?: string;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    return apiClient.get(`/tasks?${searchParams.toString()}`);
  },
  
  getAnalytics: (params: { period?: string; spaceId?: string } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    return apiClient.get(`/tasks/analytics?${searchParams.toString()}`);
  },
  
  getById: (taskId: string) => apiClient.get(`/tasks/${taskId}`),
  
  getTimeTracking: (taskId: string) => apiClient.get(`/tasks/${taskId}/time`),
  
  getBySpace: (spaceId: string, params: {
    status?: string;
    priority?: string;
    assigneeId?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    return apiClient.get(`/tasks/space/${spaceId}?${searchParams.toString()}`);
  },
};

export const analyticsApi = {
  getOverview: (period?: string) => {
    const params = period ? `?period=${period}` : '';
    return apiClient.get(`/analytics/overview${params}`);
  },
  
  getProductivityComparison: (userIds: string[], period?: string) => {
    const params = new URLSearchParams();
    params.append('userIds', userIds.join(','));
    if (period) params.append('period', period);
    return apiClient.get(`/analytics/productivity/comparison?${params.toString()}`);
  },
  
  getTeamTrends: (days: number = 30, metric: string = 'productivity') =>
    apiClient.get(`/analytics/team/trends?days=${days}&metric=${metric}`),
  
  getProjectsPerformance: (period?: string) => {
    const params = period ? `?period=${period}` : '';
    return apiClient.get(`/analytics/projects/performance${params}`);
  },
  
  getTimeBreakdown: (period?: string, userId?: string) => {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (userId) params.append('userId', userId);
    return apiClient.get(`/analytics/time/breakdown?${params.toString()}`);
  },
};

export const syncApi = {
  manual: (services: string[] = ['gitlab', 'clickup']) =>
    apiClient.post('/sync/manual', { services }),
  gitlab: () => apiClient.post('/sync/gitlab'),
  clickup: () => apiClient.post('/sync/clickup'),
  
  getStatus: (params: {
    limit?: number;
    service?: string;
    status?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    return apiClient.get(`/sync/status?${searchParams.toString()}`);
  },
  
  getStatistics: (days: number = 30) =>
    apiClient.get(`/sync/statistics?days=${days}`),
  
  cancel: (syncId: string) =>
    apiClient.post('/sync/cancel', { syncId }),
  
  getHealth: () => apiClient.get('/sync/health'),
};

export default apiClient;
