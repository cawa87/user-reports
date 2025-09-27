export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  totalCommits: number;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  totalTasksCompleted: number;
  totalTimeSpent: number;
  productivityScore: number;
  lastSeen?: string;
  recentActivity?: {
    commits: number;
    tasksCompleted: number;
    timeSpent: number;
  };
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  gitlabUrl?: string;
  namespace?: string;
  visibility?: string;
  totalCommits: number;
  lastActivity: string;
  isActive: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  clickupId: string;
  name: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'TESTING' | 'DONE' | 'CLOSED' | 'CANCELLED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  assigneeId?: string;
  projectId?: number;
  timeSpent?: number;
  estimatedTime?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Commit {
  id: string;
  sha: string;
  message: string;
  authorEmail: string;
  authorName: string;
  authorDate: string;
  additions: number;
  deletions: number;
  filesChanged: number;
  projectId: number;
  userId: string;
}

export interface TimeEntry {
  id: string;
  clickupId: string;
  userId: string;
  taskId?: string;
  startTime: string;
  duration: number;
  description?: string;
}

export interface SyncLog {
  id: string;
  service: 'GITLAB' | 'CLICKUP';
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  recordsProcessed?: number;
  message?: string;
  errorDetails?: any;
}

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    newThisWeek: number;
  };
  projects: {
    total: number;
    active: number;
    withRecentActivity: number;
  };
  commits: {
    total: number;
    thisWeek: number;
    linesOfCode: number;
  };
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    completionRate: number;
  };
  timeTracking: {
    totalHours: number;
    thisWeek: number;
    avgSessionLength: number;
  };
}

export interface UserStats {
  commits: {
    total: number;
    totalInPeriod: number;
    linesAdded: number;
    linesDeleted: number;
    filesChanged: number;
    periodStats: {
      total: number;
      linesAdded: number;
      linesDeleted: number;
      filesChanged: number;
    };
  };
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    timeSpent: number;
  };
  timeTracking: {
    totalTime: number;
    sessions: number;
    avgSessionLength: number;
  };
  productivity: {
    score: number;
    rank: number;
    percentile: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
