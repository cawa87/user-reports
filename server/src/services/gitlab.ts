import axios, { AxiosInstance } from 'axios';
import { PrismaClient } from '@prisma/client';
import { format, subDays, startOfDay } from 'date-fns';
import { syncLogger } from '@/utils/logger';
import { CacheService } from '@/config/redis';

const prisma = new PrismaClient();

interface GitLabConfig {
  url: string;
  accessToken: string;
  projectIds: number[];
}

interface GitLabProject {
  id: number;
  name: string;
  description?: string;
  web_url: string;
  namespace: {
    name: string;
    path: string;
  };
  visibility: string;
  created_at: string;
  last_activity_at: string;
  statistics?: {
    commit_count: number;
    storage_size: number;
    repository_size: number;
    lfs_objects_size: number;
  };
}

interface GitLabCommit {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  committer_name: string;
  committer_email: string;
  committed_date: string;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
}

interface GitLabContributor {
  name: string;
  email: string;
  commits: number;
  additions: number;
  deletions: number;
}

class GitLabService {
  private api: AxiosInstance;
  private config: GitLabConfig;

  constructor() {
    this.config = {
      url: process.env.GITLAB_URL || '',
      accessToken: process.env.GITLAB_ACCESS_TOKEN || '',
      projectIds: (process.env.GITLAB_PROJECT_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean),
    };

    if (!this.config.url || !this.config.accessToken) {
      throw new Error('GitLab configuration is incomplete. Please set GITLAB_URL and GITLAB_ACCESS_TOKEN');
    }

    this.api = axios.create({
      baseURL: `${this.config.url}/api/v4`,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        syncLogger.error('GitLab API error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        });
        throw error;
      }
    );
  }

  async syncAllData(): Promise<void> {
    syncLogger.info('Starting GitLab data synchronization');
    
    try {
      // Get projects to sync
      const projectsToSync = this.config.projectIds.length > 0 
        ? this.config.projectIds 
        : await this.getAllAccessibleProjectIds();

      syncLogger.info(`Syncing ${projectsToSync.length} GitLab projects`);

      // Sync projects in parallel (with concurrency limit)
      const concurrency = 3;
      for (let i = 0; i < projectsToSync.length; i += concurrency) {
        const batch = projectsToSync.slice(i, i + concurrency);
        await Promise.all(batch.map(projectId => this.syncProject(projectId)));
      }

      // Update system metrics
      await this.updateSystemMetrics();

      syncLogger.info('GitLab data synchronization completed successfully');
    } catch (error) {
      syncLogger.error('GitLab synchronization failed:', error);
      throw error;
    }
  }

  private async getAllAccessibleProjectIds(): Promise<number[]> {
    try {
      const projects = await this.api.get('/projects', {
        params: {
          membership: true,
          per_page: 100,
          order_by: 'last_activity_at',
          sort: 'desc',
        },
      });

      return projects.data.map((project: GitLabProject) => project.id);
    } catch (error) {
      syncLogger.error('Failed to get accessible projects:', error);
      return [];
    }
  }

  private async syncProject(projectId: number): Promise<void> {
    try {
      syncLogger.info(`Syncing GitLab project ${projectId}`);

      // Get project details
      const project = await this.getProjectDetails(projectId);
      if (!project) {
        syncLogger.warn(`Project ${projectId} not found or not accessible`);
        return;
      }

      // Upsert project
      await this.upsertProject(project);

      // Sync commits (last 30 days to avoid overwhelming the API)
      await this.syncProjectCommits(projectId, project.name);

      // Sync contributors and statistics
      await this.syncProjectContributors(projectId, project.name);

      // Calculate daily code statistics
      await this.calculateDailyCodeStats(projectId);

      syncLogger.info(`Successfully synced GitLab project ${projectId}: ${project.name}`);
    } catch (error) {
      syncLogger.error(`Failed to sync GitLab project ${projectId}:`, error);
    }
  }

  private async getProjectDetails(projectId: number): Promise<GitLabProject | null> {
    try {
      const response = await this.api.get(`/projects/${projectId}`, {
        params: { statistics: true },
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  private async upsertProject(project: GitLabProject): Promise<void> {
    await prisma.project.upsert({
      where: { id: project.id },
      update: {
        name: project.name,
        description: project.description || null,
        gitlabUrl: project.web_url,
        namespace: project.namespace.path,
        visibility: project.visibility,
        lastActivity: new Date(project.last_activity_at),
        totalCommits: project.statistics?.commit_count || 0,
        updatedAt: new Date(),
      },
      create: {
        id: project.id,
        name: project.name,
        description: project.description || null,
        gitlabUrl: project.web_url,
        namespace: project.namespace.path,
        visibility: project.visibility,
        lastActivity: new Date(project.last_activity_at),
        totalCommits: project.statistics?.commit_count || 0,
        createdAt: new Date(project.created_at),
      },
    });
  }

  private async syncProjectCommits(projectId: number, projectName: string): Promise<void> {
    try {
      const since = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      let page = 1;
      const perPage = 100;
      let hasMore = true;

      while (hasMore) {
        const commits = await this.api.get(`/projects/${projectId}/repository/commits`, {
          params: {
            since,
            per_page: perPage,
            page,
            with_stats: true,
          },
        });

        if (commits.data.length === 0) {
          hasMore = false;
          break;
        }

        for (const commit of commits.data) {
          await this.processCommit(commit, projectId, projectName);
        }

        page++;
        hasMore = commits.data.length === perPage;

        // Rate limiting - GitLab has API rate limits
        await this.sleep(100); // 100ms delay between requests
      }
    } catch (error) {
      syncLogger.error(`Failed to sync commits for project ${projectId}:`, error);
    }
  }

  private async processCommit(commit: GitLabCommit, projectId: number, projectName: string): Promise<void> {
    try {
      // Find or create user
      const user = await this.findOrCreateUser({
        email: commit.author_email,
        name: commit.author_name,
      });

      // Get commit stats if not included
      let stats = commit.stats;
      if (!stats) {
        try {
          const commitDetail = await this.api.get(`/projects/${projectId}/repository/commits/${commit.id}`);
          stats = commitDetail.data.stats;
        } catch (error) {
          syncLogger.warn(`Failed to get stats for commit ${commit.id}:`, error);
          stats = { additions: 0, deletions: 0, total: 0 };
        }
      }

      // Upsert commit
      await prisma.commit.upsert({
        where: { sha: commit.id },
        update: {
          message: commit.message,
          authorDate: new Date(commit.authored_date),
          additions: stats?.additions || 0,
          deletions: stats?.deletions || 0,
          filesChanged: Math.ceil((stats?.total || 0) / 10), // Estimate files changed
        },
        create: {
          sha: commit.id,
          message: commit.message,
          authorEmail: commit.author_email,
          authorName: commit.author_name,
          authorDate: new Date(commit.authored_date),
          additions: stats?.additions || 0,
          deletions: stats?.deletions || 0,
          filesChanged: Math.ceil((stats?.total || 0) / 10), // Estimate files changed
          projectId,
          userId: user.id,
        },
      });

      // Update user statistics
      await this.updateUserStatistics(user.id);

    } catch (error) {
      syncLogger.error(`Failed to process commit ${commit.id}:`, error);
    }
  }

  private async syncProjectContributors(projectId: number, projectName: string): Promise<void> {
    try {
      const contributors = await this.api.get(`/projects/${projectId}/repository/contributors`, {
        params: { order_by: 'commits', sort: 'desc' },
      });

      for (const contributor of contributors.data) {
        const user = await this.findOrCreateUser({
          email: contributor.email,
          name: contributor.name,
        });

        // Update user's total statistics
        await this.updateUserTotalStatistics(user.id, projectId, {
          commits: contributor.commits,
          additions: contributor.additions || 0,
          deletions: contributor.deletions || 0,
        });
      }
    } catch (error) {
      syncLogger.error(`Failed to sync contributors for project ${projectId}:`, error);
    }
  }

  private async calculateDailyCodeStats(projectId: number): Promise<void> {
    try {
      // Calculate stats for the last 7 days
      for (let i = 0; i < 7; i++) {
        const date = startOfDay(subDays(new Date(), i));
        const nextDate = startOfDay(subDays(new Date(), i - 1));

        // Get commits for this day
        const commits = await prisma.commit.findMany({
          where: {
            projectId,
            authorDate: {
              gte: date,
              lt: nextDate,
            },
          },
          include: { user: true },
        });

        // Group by user
        const userStats = new Map<string, any>();
        
        for (const commit of commits) {
          const userId = commit.userId;
          if (!userStats.has(userId)) {
            userStats.set(userId, {
              linesAdded: 0,
              linesDeleted: 0,
              filesChanged: 0,
              commitsCount: 0,
            });
          }

          const stats = userStats.get(userId);
          stats.linesAdded += commit.additions;
          stats.linesDeleted += commit.deletions;
          stats.filesChanged += commit.filesChanged;
          stats.commitsCount += 1;
        }

        // Save daily stats
        for (const [userId, stats] of userStats) {
          await prisma.codeStats.upsert({
            where: {
              userId_projectId_date: {
                userId,
                projectId,
                date,
              },
            },
            update: stats,
            create: {
              userId,
              projectId,
              date,
              ...stats,
            },
          });
        }
      }
    } catch (error) {
      syncLogger.error(`Failed to calculate daily code stats for project ${projectId}:`, error);
    }
  }

  private async findOrCreateUser(userData: { email: string; name: string }) {
    return await prisma.user.upsert({
      where: { email: userData.email },
      update: { 
        name: userData.name,
        lastSeen: new Date(),
      },
      create: {
        email: userData.email,
        name: userData.name,
        username: userData.email.split('@')[0],
        lastSeen: new Date(),
      },
    });
  }

  private async updateUserStatistics(userId: string): Promise<void> {
    try {
      const [totalCommits, codeStats] = await Promise.all([
        prisma.commit.count({ where: { userId } }),
        prisma.commit.aggregate({
          where: { userId },
          _sum: {
            additions: true,
            deletions: true,
            filesChanged: true,
          },
        }),
      ]);

      // Calculate productivity score based on activity
      const thirtyDaysAgo = subDays(new Date(), 30);
      const [recentCommits, recentTasks, recentTimeSpent] = await Promise.all([
        prisma.commit.count({
          where: {
            userId,
            authorDate: { gte: thirtyDaysAgo },
          },
        }),
        prisma.task.count({
          where: {
            assigneeId: userId,
            completedAt: { gte: thirtyDaysAgo },
            status: { in: ['DONE', 'CLOSED'] },
          },
        }),
        prisma.timeEntry.aggregate({
          where: {
            userId,
            startTime: { gte: thirtyDaysAgo },
          },
          _sum: { duration: true },
        }),
      ]);

      // Calculate productivity score (weighted average)
      const commitScore = Math.min(recentCommits * 10, 400); // Max 400 points from commits
      const taskScore = Math.min(recentTasks * 50, 500); // Max 500 points from tasks  
      const timeScore = Math.min((recentTimeSpent._sum.duration || 0) / 3600, 100); // Max 100 points from hours
      const productivityScore = Math.round((commitScore + taskScore + timeScore) / 10); // Scale to 0-100

      await prisma.user.update({
        where: { id: userId },
        data: {
          totalCommits,
          totalLinesAdded: codeStats._sum.additions || 0,
          totalLinesDeleted: codeStats._sum.deletions || 0,
          productivityScore,
          lastSeen: new Date(),
        },
      });

      syncLogger.info(`Updated user ${userId} stats: ${totalCommits} commits, +${codeStats._sum.additions || 0}/-${codeStats._sum.deletions || 0} lines, score: ${productivityScore}`);
    } catch (error) {
      syncLogger.error(`Failed to update user statistics for ${userId}:`, error);
    }
  }

  private async updateUserTotalStatistics(
    userId: string, 
    projectId: number, 
    stats: { commits: number; additions: number; deletions: number }
  ): Promise<void> {
    try {
      // Update user's overall statistics
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            totalCommits: Math.max(user.totalCommits, stats.commits),
            totalLinesAdded: Math.max(user.totalLinesAdded, stats.additions),
            totalLinesDeleted: Math.max(user.totalLinesDeleted, stats.deletions),
          },
        });
      }
    } catch (error) {
      syncLogger.error(`Failed to update user total statistics for ${userId}:`, error);
    }
  }

  private async updateSystemMetrics(): Promise<void> {
    try {
      const today = startOfDay(new Date());
      
      const [totalProjects, totalCommits, linesOfCode] = await Promise.all([
        prisma.project.count({ where: { isActive: true } }),
        prisma.commit.count(),
        prisma.commit.aggregate({
          _sum: { additions: true },
        }),
      ]);

      await prisma.systemMetrics.upsert({
        where: { date: today },
        update: {
          totalProjects,
          totalCommits,
          linesOfCode: linesOfCode._sum.additions || 0,
        },
        create: {
          date: today,
          totalProjects,
          totalCommits,
          linesOfCode: linesOfCode._sum.additions || 0,
        },
      });
    } catch (error) {
      syncLogger.error('Failed to update system metrics:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
const gitlabService = new GitLabService();

export const syncGitLabData = () => gitlabService.syncAllData();
export default gitlabService;
