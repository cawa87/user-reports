import express from 'express';
import { PrismaClient } from '@prisma/client';
import { subDays, startOfDay, format } from 'date-fns';
import { asyncHandler } from '@/middleware/errorHandler';
import { CacheService } from '@/config/redis';
import { getUserProductivityTrends, getTeamProductivityTrends } from '@/services/analytics';

const router = express.Router();
const prisma = new PrismaClient();

// Get comprehensive analytics overview
router.get('/overview', asyncHandler(async (req, res) => {
  const period = req.query.period as string || 'monthly';
  const cacheKey = `analytics:overview:${period}`;
  
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  // Define date ranges
  let startDate: Date;
  let previousStartDate: Date;
  switch (period) {
    case 'weekly':
      startDate = subDays(new Date(), 7);
      previousStartDate = subDays(new Date(), 14);
      break;
    case 'monthly':
      startDate = subDays(new Date(), 30);
      previousStartDate = subDays(new Date(), 60);
      break;
    case 'quarterly':
      startDate = subDays(new Date(), 90);
      previousStartDate = subDays(new Date(), 180);
      break;
    default:
      startDate = subDays(new Date(), 30);
      previousStartDate = subDays(new Date(), 60);
  }

  const endDate = new Date();
  const previousEndDate = startDate;

  // Get current period metrics
  const [
    currentCommits,
    currentTasks,
    currentTimeSpent,
    currentActiveUsers
  ] = await Promise.all([
    prisma.commit.count({
      where: { authorDate: { gte: startDate, lte: endDate } },
    }),
    prisma.task.count({
      where: { 
        completedAt: { gte: startDate, lte: endDate },
        status: { in: ['DONE', 'CLOSED'] },
      },
    }),
    prisma.timeEntry.aggregate({
      where: { startTime: { gte: startDate, lte: endDate } },
      _sum: { duration: true },
    }),
    prisma.user.count({
      where: {
        isActive: true,
        lastSeen: { gte: startDate },
      },
    }),
  ]);

  // Get previous period metrics for comparison
  const [
    previousCommits,
    previousTasks,
    previousTimeSpent,
    previousActiveUsers
  ] = await Promise.all([
    prisma.commit.count({
      where: { authorDate: { gte: previousStartDate, lte: previousEndDate } },
    }),
    prisma.task.count({
      where: { 
        completedAt: { gte: previousStartDate, lte: previousEndDate },
        status: { in: ['DONE', 'CLOSED'] },
      },
    }),
    prisma.timeEntry.aggregate({
      where: { startTime: { gte: previousStartDate, lte: previousEndDate } },
      _sum: { duration: true },
    }),
    prisma.user.count({
      where: {
        isActive: true,
        lastSeen: { gte: previousStartDate, lte: previousEndDate },
      },
    }),
  ]);

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const overview = {
    period,
    dateRange: { startDate, endDate },
    metrics: {
      commits: {
        current: currentCommits,
        previous: previousCommits,
        change: calculateChange(currentCommits, previousCommits),
      },
      tasksCompleted: {
        current: currentTasks,
        previous: previousTasks,
        change: calculateChange(currentTasks, previousTasks),
      },
      timeSpent: {
        current: currentTimeSpent._sum.duration || 0,
        previous: previousTimeSpent._sum.duration || 0,
        change: calculateChange(
          currentTimeSpent._sum.duration || 0,
          previousTimeSpent._sum.duration || 0
        ),
      },
      activeUsers: {
        current: currentActiveUsers,
        previous: previousActiveUsers,
        change: calculateChange(currentActiveUsers, previousActiveUsers),
      },
    },
    lastUpdated: new Date().toISOString(),
  };

  // Cache for 1 hour
  await CacheService.set(cacheKey, overview, CacheService.ttl.MEDIUM);
  
  res.json(overview);
}));

// Get productivity comparisons between users
router.get('/productivity/comparison', asyncHandler(async (req, res) => {
  const userIds = req.query.userIds as string;
  const period = req.query.period as string || 'monthly';
  
  if (!userIds) {
    return res.status(400).json({ error: 'userIds parameter is required' });
  }

  const userIdArray = userIds.split(',').map(id => id.trim());
  
  // Define date ranges
  let startDate: Date;
  switch (period) {
    case 'weekly':
      startDate = subDays(new Date(), 7);
      break;
    case 'monthly':
      startDate = subDays(new Date(), 30);
      break;
    case 'quarterly':
      startDate = subDays(new Date(), 90);
      break;
    default:
      startDate = subDays(new Date(), 30);
  }

  const userComparisons = await Promise.all(
    userIdArray.map(async (userId) => {
      const [user, commits, tasks, timeSpent] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            productivityScore: true,
          },
        }),
        prisma.commit.count({
          where: {
            userId,
            authorDate: { gte: startDate },
          },
        }),
        prisma.task.count({
          where: {
            assigneeId: userId,
            completedAt: { gte: startDate },
            status: { in: ['DONE', 'CLOSED'] },
          },
        }),
        prisma.timeEntry.aggregate({
          where: {
            userId,
            startTime: { gte: startDate },
          },
          _sum: { duration: true },
        }),
      ]);

      return {
        user,
        metrics: {
          commits,
          tasksCompleted: tasks,
          timeSpent: timeSpent._sum.duration || 0,
          productivityScore: user?.productivityScore || 0,
        },
      };
    })
  );

  res.json({
    period,
    dateRange: { startDate, endDate: new Date() },
    comparisons: userComparisons,
  });
}));

// Get team performance trends
router.get('/team/trends', asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const metric = req.query.metric as string || 'productivity';
  
  let trends;
  
  switch (metric) {
    case 'commits':
      trends = await getCommitTrends(days);
      break;
    case 'tasks':
      trends = await getTaskTrends(days);
      break;
    case 'time':
      trends = await getTimeTrends(days);
      break;
    default:
      trends = await getTeamProductivityTrends(days);
  }

  res.json({
    metric,
    days,
    trends,
  });
}));

// Get project performance analytics
router.get('/projects/performance', asyncHandler(async (req, res) => {
  const period = req.query.period as string || 'monthly';
  const cacheKey = `analytics:projects:${period}`;
  
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  let startDate: Date;
  switch (period) {
    case 'weekly':
      startDate = subDays(new Date(), 7);
      break;
    case 'monthly':
      startDate = subDays(new Date(), 30);
      break;
    case 'quarterly':
      startDate = subDays(new Date(), 90);
      break;
    default:
      startDate = subDays(new Date(), 30);
  }

  const projects = await prisma.project.findMany({
    where: {
      isActive: true,
      commits: {
        some: {
          authorDate: { gte: startDate },
        },
      },
    },
    select: {
      id: true,
      name: true,
      namespace: true,
      _count: {
        select: {
          commits: {
            where: { authorDate: { gte: startDate } },
          },
        },
      },
    },
  });

  const projectPerformance = await Promise.all(
    projects.map(async (project) => {
      const [commits, contributors, codeStats] = await Promise.all([
        prisma.commit.findMany({
          where: {
            projectId: project.id,
            authorDate: { gte: startDate },
          },
        }),
        prisma.commit.findMany({
          where: {
            projectId: project.id,
            authorDate: { gte: startDate },
          },
          select: { userId: true },
          distinct: ['userId'],
        }),
        prisma.commit.aggregate({
          where: {
            projectId: project.id,
            authorDate: { gte: startDate },
          },
          _sum: {
            additions: true,
            deletions: true,
            filesChanged: true,
          },
        }),
      ]);

      const velocity = commits.length / Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        project: {
          id: project.id,
          name: project.name,
          namespace: project.namespace,
        },
        metrics: {
          commits: commits.length,
          contributors: contributors.length,
          linesAdded: codeStats._sum.additions || 0,
          linesDeleted: codeStats._sum.deletions || 0,
          filesChanged: codeStats._sum.filesChanged || 0,
          velocity, // commits per day
        },
      };
    })
  );

  // Sort by commits descending
  projectPerformance.sort((a, b) => b.metrics.commits - a.metrics.commits);

  const result = {
    period,
    dateRange: { startDate, endDate: new Date() },
    projects: projectPerformance,
    summary: {
      totalProjects: projectPerformance.length,
      totalCommits: projectPerformance.reduce((sum, p) => sum + p.metrics.commits, 0),
      totalContributors: new Set(
        projectPerformance.flatMap(p => 
          Array(p.metrics.contributors).fill(0).map((_, i) => `${p.project.id}-${i}`)
        )
      ).size,
      avgVelocity: projectPerformance.length > 0
        ? projectPerformance.reduce((sum, p) => sum + p.metrics.velocity, 0) / projectPerformance.length
        : 0,
    },
  };

  // Cache for 1 hour
  await CacheService.set(cacheKey, result, CacheService.ttl.MEDIUM);
  
  res.json(result);
}));

// Get time tracking analytics
router.get('/time/breakdown', asyncHandler(async (req, res) => {
  const period = req.query.period as string || 'monthly';
  const userId = req.query.userId as string;
  
  let startDate: Date;
  switch (period) {
    case 'weekly':
      startDate = subDays(new Date(), 7);
      break;
    case 'monthly':
      startDate = subDays(new Date(), 30);
      break;
    case 'quarterly':
      startDate = subDays(new Date(), 90);
      break;
    default:
      startDate = subDays(new Date(), 30);
  }

  const where: any = {
    startTime: { gte: startDate },
  };
  if (userId) where.userId = userId;

  const [
    timeByUser,
    timeByDay,
    timeByTask,
    totalStats
  ] = await Promise.all([
    prisma.timeEntry.groupBy({
      by: ['userId'],
      where,
      _sum: { duration: true },
      _count: { id: true },
      orderBy: { _sum: { duration: 'desc' } },
      take: 10,
    }),
    prisma.timeEntry.groupBy({
      by: ['startTime'],
      where,
      _sum: { duration: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.timeEntry.groupBy({
      by: ['taskId'],
      where: {
        ...where,
        taskId: { not: null },
      },
      _sum: { duration: true },
      orderBy: { _sum: { duration: 'desc' } },
      take: 10,
    }),
    prisma.timeEntry.aggregate({
      where,
      _sum: { duration: true },
      _count: { id: true },
      _avg: { duration: true },
    }),
  ]);

  // Get user details for time breakdown
  const usersWithTime = await Promise.all(
    timeByUser.map(async (entry) => {
      const user = await prisma.user.findUnique({
        where: { id: entry.userId },
        select: { name: true, username: true, avatar: true },
      });
      return {
        user,
        totalTime: entry._sum.duration || 0,
        sessions: entry._count.id,
        avgSessionLength: entry._count.id > 0 ? (entry._sum.duration || 0) / entry._count.id : 0,
      };
    })
  );

  // Get task details for time breakdown
  const tasksWithTime = await Promise.all(
    timeByTask.map(async (entry) => {
      const task = await prisma.task.findUnique({
        where: { id: entry.taskId! },
        select: { name: true, clickupId: true },
      });
      return {
        task,
        totalTime: entry._sum.duration || 0,
      };
    })
  );

  // Process daily time data
  const dailyTime = [];
  for (let i = 29; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const dayTime = timeByDay.filter(
      entry => entry.startTime >= dayStart && entry.startTime < dayEnd
    ).reduce((sum, entry) => sum + (entry._sum.duration || 0), 0);
    
    dailyTime.push({
      date: format(date, 'yyyy-MM-dd'),
      time: dayTime,
    });
  }

  res.json({
    period,
    dateRange: { startDate, endDate: new Date() },
    summary: {
      totalTime: totalStats._sum.duration || 0,
      totalSessions: totalStats._count.id || 0,
      avgSessionLength: totalStats._avg.duration || 0,
    },
    breakdown: {
      byUser: usersWithTime,
      byTask: tasksWithTime,
      byDay: dailyTime,
    },
  });
}));

// Helper functions for trend analysis
async function getCommitTrends(days: number) {
  const trends = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const startDate = startOfDay(date);
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

    const commits = await prisma.commit.count({
      where: { authorDate: { gte: startDate, lt: endDate } },
    });

    trends.push({
      date: format(date, 'yyyy-MM-dd'),
      value: commits,
    });
  }

  return trends;
}

async function getTaskTrends(days: number) {
  const trends = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const startDate = startOfDay(date);
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

    const tasks = await prisma.task.count({
      where: { 
        completedAt: { gte: startDate, lt: endDate },
        status: { in: ['DONE', 'CLOSED'] },
      },
    });

    trends.push({
      date: format(date, 'yyyy-MM-dd'),
      value: tasks,
    });
  }

  return trends;
}

async function getTimeTrends(days: number) {
  const trends = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const startDate = startOfDay(date);
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

    const timeSpent = await prisma.timeEntry.aggregate({
      where: { startTime: { gte: startDate, lt: endDate } },
      _sum: { duration: true },
    });

    trends.push({
      date: format(date, 'yyyy-MM-dd'),
      value: timeSpent._sum.duration || 0,
    });
  }

  return trends;
}

export default router;
