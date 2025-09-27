import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, subDays, subWeeks, subMonths, format } from 'date-fns';
import { syncLogger } from '@/utils/logger';
import { CacheService } from '@/config/redis';

const prisma = new PrismaClient();

export interface ProductivityMetrics {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  date: Date;
  
  // Code metrics
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
  
  // Task metrics
  tasksCompleted: number;
  tasksInProgress: number;
  timeSpent: number; // in minutes
  avgTaskCompletionTime: number; // in hours
  
  // Productivity scores
  codeProductivityScore: number;
  taskProductivityScore: number;
  overallProductivityScore: number;
  
  // Trends
  commitTrend: number; // percentage change from previous period
  taskTrend: number;
  productivityTrend: number;
}

export interface TeamMetrics {
  period: 'daily' | 'weekly' | 'monthly';
  date: Date;
  
  // Aggregate metrics
  totalCommits: number;
  totalLinesAdded: number;
  totalTasksCompleted: number;
  totalTimeSpent: number;
  
  // Team performance
  activeMembers: number;
  avgProductivityScore: number;
  topPerformers: Array<{
    userId: string;
    name: string;
    score: number;
  }>;
  
  // Project statistics
  activeProjects: number;
  projectActivity: Array<{
    projectId: number;
    name: string;
    commits: number;
    contributors: number;
  }>;
}

export interface TrendData {
  date: string;
  value: number;
  change?: number;
}

export class AnalyticsService {
  
  // Calculate productivity metrics for all users
  async calculateProductivityMetrics(): Promise<void> {
    syncLogger.info('Calculating productivity metrics for all users');
    
    try {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true },
      });

      // Calculate metrics for different periods
      const periods: Array<'daily' | 'weekly' | 'monthly'> = ['daily', 'weekly', 'monthly'];
      
      for (const user of users) {
        for (const period of periods) {
          await this.calculateUserMetrics(user.id, period);
        }
        
        // Update user's overall productivity score
        await this.updateUserProductivityScore(user.id);
      }

      // Calculate team metrics
      for (const period of periods) {
        await this.calculateTeamMetrics(period);
      }

      syncLogger.info('Productivity metrics calculation completed');
    } catch (error) {
      syncLogger.error('Failed to calculate productivity metrics:', error);
      throw error;
    }
  }

  // Calculate metrics for a specific user and period
  private async calculateUserMetrics(userId: string, period: 'daily' | 'weekly' | 'monthly'): Promise<ProductivityMetrics | null> {
    try {
      const { startDate, endDate, previousStartDate, previousEndDate } = this.getPeriodDates(period);

      // Get code metrics
      const [commits, codeStats] = await Promise.all([
        prisma.commit.findMany({
          where: {
            userId,
            authorDate: { gte: startDate, lte: endDate },
          },
        }),
        prisma.codeStats.aggregate({
          where: {
            userId,
            date: { gte: startDate, lte: endDate },
          },
          _sum: {
            linesAdded: true,
            linesDeleted: true,
            filesChanged: true,
            commitsCount: true,
          },
        }),
      ]);

      // Get task metrics
      const [tasksCompleted, tasksInProgress, timeEntries] = await Promise.all([
        prisma.task.count({
          where: {
            assigneeId: userId,
            completedAt: { gte: startDate, lte: endDate },
            status: { in: ['DONE', 'CLOSED'] },
          },
        }),
        prisma.task.count({
          where: {
            assigneeId: userId,
            status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW', 'TESTING'] },
          },
        }),
        prisma.timeEntry.aggregate({
          where: {
            userId,
            startTime: { gte: startDate, lte: endDate },
          },
          _sum: { duration: true },
        }),
      ]);

      // Calculate average task completion time
      const completedTasks = await prisma.task.findMany({
        where: {
          assigneeId: userId,
          completedAt: { gte: startDate, lte: endDate },
          status: { in: ['DONE', 'CLOSED'] },
        },
        select: {
          createdAt: true,
          completedAt: true,
        },
      });

      const avgTaskCompletionTime = this.calculateAvgCompletionTime(completedTasks);

      // Calculate current period metrics
      const currentMetrics = {
        commits: commits.length,
        linesAdded: codeStats._sum.linesAdded || 0,
        linesDeleted: codeStats._sum.linesDeleted || 0,
        filesChanged: codeStats._sum.filesChanged || 0,
        tasksCompleted,
        tasksInProgress,
        timeSpent: timeEntries._sum.duration || 0,
        avgTaskCompletionTime,
      };

      // Get previous period metrics for trend calculation
      const previousMetrics = await this.getPreviousPeriodMetrics(userId, previousStartDate, previousEndDate);

      // Calculate productivity scores
      const codeProductivityScore = this.calculateCodeProductivityScore(currentMetrics);
      const taskProductivityScore = this.calculateTaskProductivityScore(currentMetrics);
      const overallProductivityScore = (codeProductivityScore + taskProductivityScore) / 2;

      // Calculate trends
      const commitTrend = this.calculateTrend(currentMetrics.commits, previousMetrics.commits);
      const taskTrend = this.calculateTrend(currentMetrics.tasksCompleted, previousMetrics.tasksCompleted);
      const productivityTrend = this.calculateTrend(overallProductivityScore, previousMetrics.overallProductivityScore || 0);

      const metrics: ProductivityMetrics = {
        userId,
        period,
        date: startDate,
        ...currentMetrics,
        codeProductivityScore,
        taskProductivityScore,
        overallProductivityScore,
        commitTrend,
        taskTrend,
        productivityTrend,
      };

      // Cache the metrics
      await CacheService.set(
        `user:${userId}:metrics:${period}:${format(startDate, 'yyyy-MM-dd')}`,
        metrics,
        CacheService.ttl.LONG
      );

      return metrics;
    } catch (error) {
      syncLogger.error(`Failed to calculate metrics for user ${userId}, period ${period}:`, error);
      return null;
    }
  }

  // Calculate team-wide metrics
  private async calculateTeamMetrics(period: 'daily' | 'weekly' | 'monthly'): Promise<TeamMetrics | null> {
    try {
      const { startDate, endDate } = this.getPeriodDates(period);

      // Get aggregate metrics
      const [commitStats, taskStats, timeStats, userStats] = await Promise.all([
        prisma.commit.aggregate({
          where: { authorDate: { gte: startDate, lte: endDate } },
          _count: { id: true },
          _sum: { additions: true, deletions: true },
        }),
        prisma.task.aggregate({
          where: { 
            completedAt: { gte: startDate, lte: endDate },
            status: { in: ['DONE', 'CLOSED'] },
          },
          _count: { id: true },
        }),
        prisma.timeEntry.aggregate({
          where: { startTime: { gte: startDate, lte: endDate } },
          _sum: { duration: true },
        }),
        prisma.user.count({
          where: { 
            isActive: true,
            lastSeen: { gte: subDays(new Date(), 7) }, // Active in last 7 days
          },
        }),
      ]);

      // Get top performers
      const topPerformers = await this.getTopPerformers(startDate, endDate, 5);

      // Get project activity
      const projectActivity = await this.getProjectActivity(startDate, endDate);

      // Calculate average productivity score
      const productivityScores = await prisma.user.findMany({
        where: { isActive: true },
        select: { productivityScore: true },
      });
      
      const avgProductivityScore = productivityScores.length > 0
        ? productivityScores.reduce((sum, user) => sum + user.productivityScore, 0) / productivityScores.length
        : 0;

      const teamMetrics: TeamMetrics = {
        period,
        date: startDate,
        totalCommits: commitStats._count.id || 0,
        totalLinesAdded: commitStats._sum.additions || 0,
        totalTasksCompleted: taskStats._count.id || 0,
        totalTimeSpent: timeStats._sum.duration || 0,
        activeMembers: userStats,
        avgProductivityScore,
        topPerformers,
        activeProjects: projectActivity.length,
        projectActivity,
      };

      // Cache team metrics
      await CacheService.set(
        `team:metrics:${period}:${format(startDate, 'yyyy-MM-dd')}`,
        teamMetrics,
        CacheService.ttl.LONG
      );

      return teamMetrics;
    } catch (error) {
      syncLogger.error(`Failed to calculate team metrics for period ${period}:`, error);
      return null;
    }
  }

  // Get productivity trends for a user
  async getUserProductivityTrends(userId: string, days: number = 30): Promise<TrendData[]> {
    const cacheKey = `user:${userId}:trends:${days}`;
    const cached = await CacheService.get<TrendData[]>(cacheKey);
    if (cached) return cached;

    try {
      const trends: TrendData[] = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const startDate = startOfDay(date);
        const endDate = endOfDay(date);

        const [commits, tasksCompleted] = await Promise.all([
          prisma.commit.count({
            where: {
              userId,
              authorDate: { gte: startDate, lte: endDate },
            },
          }),
          prisma.task.count({
            where: {
              assigneeId: userId,
              completedAt: { gte: startDate, lte: endDate },
              status: { in: ['DONE', 'CLOSED'] },
            },
          }),
        ]);

        // Calculate simple productivity score (commits + tasks * 2)
        const productivityScore = commits + (tasksCompleted * 2);
        
        trends.push({
          date: format(date, 'yyyy-MM-dd'),
          value: productivityScore,
        });
      }

      // Calculate change percentages
      for (let i = 1; i < trends.length; i++) {
        const previous = trends[i - 1].value;
        const current = trends[i].value;
        trends[i].change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      }

      await CacheService.set(cacheKey, trends, CacheService.ttl.MEDIUM);
      return trends;
    } catch (error) {
      syncLogger.error(`Failed to get productivity trends for user ${userId}:`, error);
      return [];
    }
  }

  // Get team productivity trends
  async getTeamProductivityTrends(days: number = 30): Promise<TrendData[]> {
    const cacheKey = `team:trends:${days}`;
    const cached = await CacheService.get<TrendData[]>(cacheKey);
    if (cached) return cached;

    try {
      const trends: TrendData[] = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const startDate = startOfDay(date);
        const endDate = endOfDay(date);

        const [commits, tasksCompleted] = await Promise.all([
          prisma.commit.count({
            where: { authorDate: { gte: startDate, lte: endDate } },
          }),
          prisma.task.count({
            where: {
              completedAt: { gte: startDate, lte: endDate },
              status: { in: ['DONE', 'CLOSED'] },
            },
          }),
        ]);

        const productivityScore = commits + (tasksCompleted * 2);
        
        trends.push({
          date: format(date, 'yyyy-MM-dd'),
          value: productivityScore,
        });
      }

      // Calculate change percentages
      for (let i = 1; i < trends.length; i++) {
        const previous = trends[i - 1].value;
        const current = trends[i].value;
        trends[i].change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      }

      await CacheService.set(cacheKey, trends, CacheService.ttl.MEDIUM);
      return trends;
    } catch (error) {
      syncLogger.error('Failed to get team productivity trends:', error);
      return [];
    }
  }

  // Helper methods
  private getPeriodDates(period: 'daily' | 'weekly' | 'monthly') {
    const now = new Date();
    let startDate: Date, endDate: Date, previousStartDate: Date, previousEndDate: Date;

    switch (period) {
      case 'daily':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        previousStartDate = startOfDay(subDays(now, 1));
        previousEndDate = endOfDay(subDays(now, 1));
        break;
      case 'weekly':
        startDate = subDays(startOfDay(now), 6); // Last 7 days
        endDate = endOfDay(now);
        previousStartDate = subDays(startDate, 7);
        previousEndDate = subDays(endDate, 7);
        break;
      case 'monthly':
        startDate = subDays(startOfDay(now), 29); // Last 30 days
        endDate = endOfDay(now);
        previousStartDate = subDays(startDate, 30);
        previousEndDate = subDays(endDate, 30);
        break;
    }

    return { startDate, endDate, previousStartDate, previousEndDate };
  }

  private async getPreviousPeriodMetrics(userId: string, startDate: Date, endDate: Date) {
    const [commits, tasks, timeEntries] = await Promise.all([
      prisma.commit.count({
        where: {
          userId,
          authorDate: { gte: startDate, lte: endDate },
        },
      }),
      prisma.task.count({
        where: {
          assigneeId: userId,
          completedAt: { gte: startDate, lte: endDate },
          status: { in: ['DONE', 'CLOSED'] },
        },
      }),
      prisma.timeEntry.aggregate({
        where: {
          userId,
          startTime: { gte: startDate, lte: endDate },
        },
        _sum: { duration: true },
      }),
    ]);

    return {
      commits,
      tasksCompleted: tasks,
      timeSpent: timeEntries._sum.duration || 0,
      overallProductivityScore: 0, // Will be calculated if needed
    };
  }

  private calculateAvgCompletionTime(tasks: Array<{ createdAt: Date; completedAt: Date | null }>): number {
    if (tasks.length === 0) return 0;

    const totalHours = tasks.reduce((sum, task) => {
      if (!task.completedAt) return sum;
      const diffMs = task.completedAt.getTime() - task.createdAt.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return sum + diffHours;
    }, 0);

    return totalHours / tasks.length;
  }

  private calculateCodeProductivityScore(metrics: any): number {
    // Weighted scoring: commits (30%), lines added (40%), files changed (30%)
    const commitScore = Math.min(metrics.commits * 10, 100); // Max 100 for 10+ commits
    const linesScore = Math.min(metrics.linesAdded / 10, 100); // Max 100 for 1000+ lines
    const filesScore = Math.min(metrics.filesChanged * 5, 100); // Max 100 for 20+ files

    return (commitScore * 0.3 + linesScore * 0.4 + filesScore * 0.3);
  }

  private calculateTaskProductivityScore(metrics: any): number {
    // Weighted scoring: tasks completed (50%), time efficiency (30%), active tasks (20%)
    const taskScore = Math.min(metrics.tasksCompleted * 20, 100); // Max 100 for 5+ tasks
    const timeScore = metrics.avgTaskCompletionTime > 0 
      ? Math.max(100 - (metrics.avgTaskCompletionTime * 2), 0) // Penalty for long completion times
      : 50; // Default score if no completion time data
    const activeScore = Math.min(metrics.tasksInProgress * 10, 50); // Max 50 for 5+ active tasks

    return (taskScore * 0.5 + timeScore * 0.3 + activeScore * 0.2);
  }

  private calculateTrend(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private async getTopPerformers(startDate: Date, endDate: Date, limit: number) {
    // This is a simplified calculation - you might want to use the cached metrics
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        productivityScore: true,
      },
      orderBy: { productivityScore: 'desc' },
      take: limit,
    });

    return users.map(user => ({
      userId: user.id,
      name: user.name || user.id,
      score: user.productivityScore,
    }));
  }

  private async getProjectActivity(startDate: Date, endDate: Date) {
    const projects = await prisma.project.findMany({
      where: {
        isActive: true,
        commits: {
          some: {
            authorDate: { gte: startDate, lte: endDate },
          },
        },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            commits: {
              where: {
                authorDate: { gte: startDate, lte: endDate },
              },
            },
          },
        },
      },
    });

    const projectActivity = await Promise.all(
      projects.map(async (project) => {
        const contributors = await prisma.commit.findMany({
          where: {
            projectId: project.id,
            authorDate: { gte: startDate, lte: endDate },
          },
          select: { userId: true },
          distinct: ['userId'],
        });

        return {
          projectId: project.id,
          name: project.name,
          commits: project._count.commits,
          contributors: contributors.length,
        };
      })
    );

    return projectActivity.sort((a, b) => b.commits - a.commits);
  }

  private async updateUserProductivityScore(userId: string): Promise<void> {
    try {
      // Get recent metrics (last 30 days)
      const metrics = await this.calculateUserMetrics(userId, 'monthly');
      
      if (metrics) {
        await prisma.user.update({
          where: { id: userId },
          data: { productivityScore: metrics.overallProductivityScore },
        });
      }
    } catch (error) {
      syncLogger.error(`Failed to update productivity score for user ${userId}:`, error);
    }
  }
}

// Export singleton instance
const analyticsService = new AnalyticsService();

export const calculateProductivityMetrics = () => analyticsService.calculateProductivityMetrics();
export const getUserProductivityTrends = (userId: string, days?: number) => 
  analyticsService.getUserProductivityTrends(userId, days);
export const getTeamProductivityTrends = (days?: number) => 
  analyticsService.getTeamProductivityTrends(days);

export default analyticsService;
