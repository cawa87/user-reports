import express from 'express';
import { PrismaClient } from '@prisma/client';
import { subDays, startOfDay } from 'date-fns';
import { asyncHandler } from '@/middleware/errorHandler';
import { CacheService } from '@/config/redis';
import { getUserProductivityTrends } from '@/services/analytics';

const router = express.Router();
const prisma = new PrismaClient();

// Get all users with summary statistics
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;
  const sortBy = req.query.sortBy as string || 'productivityScore';
  const sortOrder = req.query.sortOrder as string || 'desc';
  const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
  
  // Date range filters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  
  // Numeric filters
  const minCommits = req.query.minCommits ? parseInt(req.query.minCommits as string) : undefined;
  const minTasks = req.query.minTasks ? parseInt(req.query.minTasks as string) : undefined;
  const minProductivity = req.query.minProductivity ? parseInt(req.query.minProductivity as string) : undefined;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (isActive !== undefined) {
    where.isActive = isActive;
  }
  
  // Apply numeric filters
  if (minCommits !== undefined) {
    where.totalCommits = { gte: minCommits };
  }
  if (minTasks !== undefined) {
    where.totalTasksCompleted = { gte: minTasks };
  }
  if (minProductivity !== undefined) {
    where.productivityScore = { gte: minProductivity };
  }
  
  // Apply date range filter - filter users who have activity in this range
  // This includes commits, tasks, or any other activity in the date range
  if (startDate || endDate) {
    where.OR = [
      // Include all users if no search/other filters are applied
      ...(where.OR || []),
      // Users with commits in date range
      {
        commits: {
          some: {
            authorDate: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          },
        },
      },
      // Users with tasks updated in date range
      {
        tasks: {
          some: {
            updatedAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          },
        },
      },
      // Users with time entries in date range
      {
        timeEntries: {
          some: {
            startTime: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          },
        },
      },
    ];
    
    // If there's already an OR clause from search, we need to combine them properly
    if (search) {
      const searchOR = where.OR.slice(0, 3); // First 3 are search conditions
      const activityOR = where.OR.slice(3); // Rest are activity conditions
      
      where.AND = [
        { OR: searchOR },
        { OR: activityOR },
      ];
      delete where.OR;
    }
  }

  // Build order by clause
  const orderBy: any = {};
  switch (sortBy) {
    case 'name':
      orderBy.name = sortOrder;
      break;
    case 'commits':
      orderBy.totalCommits = sortOrder;
      break;
    case 'tasks':
      orderBy.totalTasksCompleted = sortOrder;
      break;
    case 'timeSpent':
      orderBy.totalTimeSpent = sortOrder;
      break;
    case 'lastSeen':
      orderBy.lastSeen = sortOrder;
      break;
    default:
      orderBy.productivityScore = sortOrder;
  }

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        avatar: true,
        isActive: true,
        lastSeen: true,
        totalCommits: true,
        totalLinesAdded: true,
        totalLinesDeleted: true,
        totalTasksCompleted: true,
        totalTimeSpent: true,
        productivityScore: true,
        gitlabId: true,
        clickupId: true,
        createdAt: true,
        _count: {
          select: {
            commits: true,
            tasks: true,
            timeEntries: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  // Add recent activity for each user
  const usersWithActivity = await Promise.all(
    users.map(async (user) => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      const [recentCommits, recentTasks, recentTimeSpent] = await Promise.all([
        prisma.commit.count({
          where: {
            userId: user.id,
            authorDate: { gte: thirtyDaysAgo },
          },
        }),
        prisma.task.count({
          where: {
            assigneeId: user.id,
            completedAt: { gte: thirtyDaysAgo },
            status: { in: ['DONE', 'CLOSED'] },
          },
        }),
        prisma.timeEntry.aggregate({
          where: {
            userId: user.id,
            startTime: { gte: thirtyDaysAgo },
          },
          _sum: { duration: true },
        }),
      ]);

      return {
        ...user,
        recentActivity: {
          commits: recentCommits,
          tasksCompleted: recentTasks,
          timeSpent: recentTimeSpent._sum.duration || 0,
        },
      };
    })
  );

  res.json({
    users: usersWithActivity,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: page * limit < totalCount,
      hasPrev: page > 1,
    },
  });
}));

// Get detailed user statistics
router.get('/:userId/stats', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const period = req.query.period as string || 'monthly';
  
  const cacheKey = CacheService.keys.userStats(userId);
  const cached = await CacheService.get(cacheKey);
  
  if (cached) {
    return res.json(cached);
  }

  // Get user basic info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          commits: true,
          tasks: true,
          timeEntries: true,
          codeStats: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Define date ranges based on period
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
    case 'yearly':
      startDate = subDays(new Date(), 365);
      break;
    default:
      startDate = subDays(new Date(), 30);
  }

  // Get detailed statistics
  const [
    commits,
    tasks,
    timeEntries,
    codeStats,
    projectsContributed
  ] = await Promise.all([
    prisma.commit.findMany({
      where: {
        userId,
        authorDate: { gte: startDate },
      },
      include: {
        project: {
          select: { name: true },
        },
      },
      orderBy: { authorDate: 'desc' },
      take: 50,
    }),
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        updatedAt: { gte: startDate },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    prisma.timeEntry.findMany({
      where: {
        userId,
        startTime: { gte: startDate },
      },
      include: {
        task: {
          select: { name: true, clickupId: true },
        },
      },
      orderBy: { startTime: 'desc' },
      take: 50,
    }),
    prisma.codeStats.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      include: {
        project: {
          select: { name: true },
        },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.project.findMany({
      where: {
        commits: {
          some: {
            userId,
            authorDate: { gte: startDate },
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
                userId,
                authorDate: { gte: startDate },
              },
            },
          },
        },
      },
    }),
  ]);

  // Calculate period-specific statistics from recent commits
  const periodStats = {
    total: commits.length,
    linesAdded: commits.reduce((sum, c) => sum + c.additions, 0),
    linesDeleted: commits.reduce((sum, c) => sum + c.deletions, 0),
    filesChanged: commits.reduce((sum, c) => sum + c.filesChanged, 0),
  };

  // Get overall user statistics (total across all time)
  const [totalCommitCount, totalCodeStats] = await Promise.all([
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

  // Calculate aggregated statistics
  const stats = {
    commits: {
      total: totalCommitCount,
      totalInPeriod: periodStats.total,
      linesAdded: totalCodeStats._sum.additions || 0,
      linesDeleted: totalCodeStats._sum.deletions || 0,
      filesChanged: totalCodeStats._sum.filesChanged || 0,
      periodStats: periodStats,
    },
    tasks: {
      total: tasks.length,
      completed: tasks.filter(t => ['DONE', 'CLOSED'].includes(t.status)).length,
      inProgress: tasks.filter(t => ['TODO', 'IN_PROGRESS', 'REVIEW', 'TESTING'].includes(t.status)).length,
      timeSpent: tasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0),
    },
    timeTracking: {
      totalTime: timeEntries.reduce((sum, te) => sum + te.duration, 0),
      sessions: timeEntries.length,
      avgSessionLength: timeEntries.length > 0 
        ? timeEntries.reduce((sum, te) => sum + te.duration, 0) / timeEntries.length 
        : 0,
    },
    productivity: {
      score: user.productivityScore,
      rank: 0, // Will be calculated
      percentile: 0, // Will be calculated
    },
  };

  // Calculate user rank and percentile
  const [betterUsers, totalActiveUsers] = await Promise.all([
    prisma.user.count({
      where: {
        isActive: true,
        productivityScore: { gt: user.productivityScore },
      },
    }),
    prisma.user.count({
      where: { isActive: true },
    }),
  ]);

  stats.productivity.rank = betterUsers + 1;
  stats.productivity.percentile = totalActiveUsers > 0 
    ? ((totalActiveUsers - betterUsers) / totalActiveUsers) * 100 
    : 0;

  const userStats = {
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isActive: user.isActive,
      lastSeen: user.lastSeen,
      gitlabId: user.gitlabId,
      clickupId: user.clickupId,
      createdAt: user.createdAt,
    },
    stats,
    recentActivity: {
      commits: commits.slice(0, 10),
      tasks: tasks.slice(0, 10),
      timeEntries: timeEntries.slice(0, 10),
    },
    projectsContributed,
    codeStats,
    period,
    lastUpdated: new Date().toISOString(),
  };

  // Cache for 15 minutes
  await CacheService.set(cacheKey, userStats, 900);
  
  res.json(userStats);
}));

// Get user productivity trends
router.get('/:userId/trends', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const days = parseInt(req.query.days as string) || 30;
  
  const trends = await getUserProductivityTrends(userId, days);
  res.json(trends);
}));

// Get user's commit activity
router.get('/:userId/commits', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : subDays(new Date(), 30);
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

  const skip = (page - 1) * limit;

  const where: any = {
    userId,
    authorDate: { gte: startDate, lte: endDate },
  };
  
  if (projectId) {
    where.projectId = projectId;
  }

  const [commits, totalCount] = await Promise.all([
    prisma.commit.findMany({
      where,
      include: {
        project: {
          select: { name: true },
        },
      },
      orderBy: { authorDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.commit.count({ where }),
  ]);

  res.json({
    commits,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: page * limit < totalCount,
      hasPrev: page > 1,
    },
  });
}));

// Get user's task activity
router.get('/:userId/tasks', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const priority = req.query.priority as string;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : subDays(new Date(), 30);
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

  const skip = (page - 1) * limit;

  const where: any = {
    assigneeId: userId,
    updatedAt: { gte: startDate, lte: endDate },
  };
  
  if (status) {
    where.status = status;
  }
  
  if (priority) {
    where.priority = priority;
  }

  const [tasks, totalCount] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  res.json({
    tasks,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: page * limit < totalCount,
      hasPrev: page > 1,
    },
  });
}));

// Get user's time tracking
router.get('/:userId/time', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : subDays(new Date(), 30);
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

  const skip = (page - 1) * limit;

  const where = {
    userId,
    startTime: { gte: startDate, lte: endDate },
  };

  const [timeEntries, totalCount, totalTime] = await Promise.all([
    prisma.timeEntry.findMany({
      where,
      include: {
        task: {
          select: { name: true, clickupId: true },
        },
      },
      orderBy: { startTime: 'desc' },
      skip,
      take: limit,
    }),
    prisma.timeEntry.count({ where }),
    prisma.timeEntry.aggregate({
      where,
      _sum: { duration: true },
    }),
  ]);

  res.json({
    timeEntries,
    summary: {
      totalTime: totalTime._sum.duration || 0,
      totalEntries: totalCount,
      avgSessionLength: totalCount > 0 ? (totalTime._sum.duration || 0) / totalCount : 0,
    },
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: page * limit < totalCount,
      hasPrev: page > 1,
    },
  });
}));

// Get user suggestions for autocomplete
router.get('/suggestions', asyncHandler(async (req, res) => {
  const search = req.query.q as string;
  const limit = parseInt(req.query.limit as string) || 10;

  if (!search || search.trim().length < 2) {
    return res.json({ suggestions: [] });
  }

  const searchTerm = search.trim();

  const suggestions = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { username: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      avatar: true,
    },
    orderBy: [
      { name: 'asc' },
      { email: 'asc' },
    ],
    take: limit,
  });

  res.json({ suggestions });
}));

export default router;
