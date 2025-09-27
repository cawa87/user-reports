import express from 'express';
import { PrismaClient } from '@prisma/client';
import { startOfDay, subDays, format } from 'date-fns';
import { asyncHandler } from '@/middleware/errorHandler';
import { CacheService } from '@/config/redis';
import { getTeamProductivityTrends } from '@/services/analytics';

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard overview statistics
router.get('/', asyncHandler(async (req, res) => {
  const cacheKey = CacheService.keys.dashboardStats;
  const cached = await CacheService.get(cacheKey);
  
  if (cached) {
    return res.json(cached);
  }

  // Get basic counts
  const [
    totalUsers,
    activeUsers,
    totalProjects,
    totalCommits,
    totalTasks,
    completedTasks,
    totalTimeSpent
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        isActive: true,
        lastSeen: { gte: subDays(new Date(), 7) }, // Active in last 7 days
      },
    }),
    prisma.project.count({ where: { isActive: true } }),
    prisma.commit.count(),
    prisma.task.count(),
    prisma.task.count({ where: { status: { in: ['DONE', 'CLOSED'] } } }),
    prisma.timeEntry.aggregate({
      _sum: { duration: true },
    }),
  ]);

  // Get recent activity (last 30 days)
  const thirtyDaysAgo = subDays(new Date(), 30);
  
  const [recentCommits, recentTasks, commitsByDay] = await Promise.all([
    prisma.commit.count({
      where: { authorDate: { gte: thirtyDaysAgo } },
    }),
    prisma.task.count({
      where: { 
        completedAt: { gte: thirtyDaysAgo },
        status: { in: ['DONE', 'CLOSED'] },
      },
    }),
    // Get commits grouped by day for the last 30 days
    prisma.commit.groupBy({
      by: ['authorDate'],
      where: { authorDate: { gte: thirtyDaysAgo } },
      _count: { id: true },
      orderBy: { authorDate: 'asc' },
    }),
  ]);

  // Process daily commits data
  const dailyCommits = [];
  for (let i = 29; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const dayCommits = commitsByDay.filter(
      commit => commit.authorDate >= dayStart && commit.authorDate < dayEnd
    ).reduce((sum, commit) => sum + commit._count.id, 0);
    
    dailyCommits.push({
      date: format(date, 'yyyy-MM-dd'),
      commits: dayCommits,
    });
  }

  // Get top contributors (last 30 days)
  const topContributors = await prisma.commit.groupBy({
    by: ['userId'],
    where: { authorDate: { gte: thirtyDaysAgo } },
    _count: { id: true },
    _sum: { additions: true, deletions: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const topContributorsWithNames = await Promise.all(
    topContributors.map(async (contributor) => {
      const user = await prisma.user.findUnique({
        where: { id: contributor.userId },
        select: { name: true, username: true, avatar: true },
      });
      return {
        userId: contributor.userId,
        name: user?.name || user?.username || 'Unknown',
        avatar: user?.avatar,
        commits: contributor._count.id,
        linesAdded: contributor._sum.additions || 0,
        linesDeleted: contributor._sum.deletions || 0,
      };
    })
  );

  // Get project activity
  const projectActivity = await prisma.project.findMany({
    where: {
      isActive: true,
      commits: {
        some: {
          authorDate: { gte: thirtyDaysAgo },
        },
      },
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          commits: {
            where: { authorDate: { gte: thirtyDaysAgo } },
          },
        },
      },
    },
    orderBy: {
      commits: {
        _count: 'desc',
      },
    },
    take: 5,
  });

  // Calculate productivity metrics
  const avgProductivityScore = await prisma.user.aggregate({
    where: { isActive: true },
    _avg: { productivityScore: true },
  });

  const dashboardData = {
    overview: {
      totalUsers,
      activeUsers,
      totalProjects,
      totalCommits,
      totalTasks,
      completedTasks,
      taskCompletionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      totalTimeSpent: totalTimeSpent._sum.duration || 0,
      avgProductivityScore: avgProductivityScore._avg.productivityScore || 0,
    },
    recentActivity: {
      commits: recentCommits,
      tasksCompleted: recentTasks,
    },
    charts: {
      dailyCommits,
      topContributors: topContributorsWithNames,
      projectActivity: projectActivity.map(project => ({
        id: project.id,
        name: project.name,
        commits: project._count.commits,
      })),
    },
    lastUpdated: new Date().toISOString(),
  };

  // Cache for 10 minutes
  await CacheService.set(cacheKey, dashboardData, 600);
  
  res.json(dashboardData);
}));

// Get productivity trends
router.get('/trends', asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const cacheKey = CacheService.keys.trends(`team-${days}`);
  
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const trends = await getTeamProductivityTrends(days);
  
  // Cache for 1 hour
  await CacheService.set(cacheKey, trends, CacheService.ttl.MEDIUM);
  
  res.json(trends);
}));

// Get leaderboard
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const period = req.query.period as string || 'monthly';
  const limit = parseInt(req.query.limit as string) || 10;
  
  const cacheKey = `${CacheService.keys.leaderboard}:${period}:${limit}`;
  const cached = await CacheService.get(cacheKey);
  
  if (cached) {
    return res.json(cached);
  }

  let dateFilter: Date;
  switch (period) {
    case 'daily':
      dateFilter = startOfDay(new Date());
      break;
    case 'weekly':
      dateFilter = subDays(new Date(), 7);
      break;
    case 'monthly':
      dateFilter = subDays(new Date(), 30);
      break;
    default:
      dateFilter = subDays(new Date(), 30);
  }

  // Get users with their recent activity
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      productivityScore: true,
      totalCommits: true,
      totalTasksCompleted: true,
      totalTimeSpent: true,
      _count: {
        select: {
          commits: {
            where: { authorDate: { gte: dateFilter } },
          },
          tasks: {
            where: { 
              completedAt: { gte: dateFilter },
              status: { in: ['DONE', 'CLOSED'] },
            },
          },
        },
      },
    },
    orderBy: { productivityScore: 'desc' },
    take: limit,
  });

  const leaderboard = users.map((user, index) => ({
    rank: index + 1,
    userId: user.id,
    name: user.name || user.username,
    avatar: user.avatar,
    productivityScore: user.productivityScore,
    recentCommits: user._count.commits,
    recentTasksCompleted: user._count.tasks,
    totalCommits: user.totalCommits,
    totalTasksCompleted: user.totalTasksCompleted,
    totalTimeSpent: user.totalTimeSpent,
  }));

  // Cache for 30 minutes
  await CacheService.set(cacheKey, leaderboard, 1800);
  
  res.json(leaderboard);
}));

// Get activity summary for a specific time range
router.get('/activity', asyncHandler(async (req, res) => {
  const startDate = req.query.startDate 
    ? new Date(req.query.startDate as string)
    : subDays(new Date(), 7);
  const endDate = req.query.endDate 
    ? new Date(req.query.endDate as string)
    : new Date();

  const [commits, tasks, timeEntries] = await Promise.all([
    prisma.commit.findMany({
      where: {
        authorDate: { gte: startDate, lte: endDate },
      },
      include: {
        user: {
          select: { name: true, username: true, avatar: true },
        },
        project: {
          select: { name: true },
        },
      },
      orderBy: { authorDate: 'desc' },
      take: 50,
    }),
    prisma.task.findMany({
      where: {
        updatedAt: { gte: startDate, lte: endDate },
      },
      include: {
        assignee: {
          select: { name: true, username: true, avatar: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    prisma.timeEntry.findMany({
      where: {
        startTime: { gte: startDate, lte: endDate },
      },
      include: {
        user: {
          select: { name: true, username: true, avatar: true },
        },
        task: {
          select: { name: true, clickupId: true },
        },
      },
      orderBy: { startTime: 'desc' },
      take: 50,
    }),
  ]);

  // Combine and sort activities by timestamp
  const activities = [
    ...commits.map(commit => ({
      type: 'commit',
      id: commit.sha,
      timestamp: commit.authorDate,
      user: commit.user,
      project: commit.project?.name,
      message: commit.message,
      additions: commit.additions,
      deletions: commit.deletions,
    })),
    ...tasks.map(task => ({
      type: 'task',
      id: task.clickupId,
      timestamp: task.updatedAt,
      user: task.assignee,
      name: task.name,
      status: task.status,
      priority: task.priority,
    })),
    ...timeEntries.map(entry => ({
      type: 'time_entry',
      id: entry.clickupId || entry.id,
      timestamp: entry.startTime,
      user: entry.user,
      task: entry.task?.name,
      duration: entry.duration,
      description: entry.description,
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  res.json({
    activities: activities.slice(0, 100), // Limit to 100 most recent
    summary: {
      totalCommits: commits.length,
      totalTasks: tasks.length,
      totalTimeEntries: timeEntries.length,
      dateRange: { startDate, endDate },
    },
  });
}));

// Get recent activity feed for dashboard
router.get('/recent-activity', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const days = parseInt(req.query.days as string) || 7;
  const startDate = subDays(new Date(), days);

  const [recentCommits, recentTasks] = await Promise.all([
    // Get recent commits
    prisma.commit.findMany({
      where: {
        authorDate: { gte: startDate },
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        project: {
          select: { id: true, name: true, namespace: true },
        },
      },
      orderBy: { authorDate: 'desc' },
      take: Math.ceil(limit * 0.6), // 60% commits
    }),
    
    // Get recent tasks
    prisma.task.findMany({
      where: {
        updatedAt: { gte: startDate },
      },
      include: {
        assignee: {
          select: { id: true, name: true, username: true, avatar: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: Math.ceil(limit * 0.4), // 40% tasks
    }),
  ]);

  // Transform activities to a common format
  const activities = [
    // Transform commits
    ...recentCommits.map(commit => ({
      id: commit.sha,
      type: 'commit' as const,
      title: commit.message || 'Code commit',
      description: commit.additions > 0 || commit.deletions > 0 
        ? `+${commit.additions} -${commit.deletions} lines in ${commit.filesChanged || 1} file${commit.filesChanged !== 1 ? 's' : ''}`
        : undefined,
      user: {
        name: commit.user?.name || commit.user?.username || 'Unknown',
        avatar: commit.user?.avatar,
      },
      timestamp: commit.authorDate.toISOString(),
      link: `/projects/${commit.project?.id}`,
      metadata: {
        projectName: commit.project?.namespace 
          ? `${commit.project.namespace}/${commit.project.name}`
          : commit.project?.name,
        additions: commit.additions,
        deletions: commit.deletions,
        filesChanged: commit.filesChanged,
      },
    })),
    
    // Transform tasks
    ...recentTasks.map(task => ({
      id: task.clickupId,
      type: 'task' as const,
      title: task.name || 'Task updated',
      description: task.status === 'DONE' || task.status === 'CLOSED' 
        ? 'Task completed' 
        : `Task status: ${task.status.replace('_', ' ').toLowerCase()}`,
      user: {
        name: task.assignee?.name || task.assignee?.username || 'Unassigned',
        avatar: task.assignee?.avatar,
      },
      timestamp: task.updatedAt.toISOString(),
      link: `/tasks`,
      metadata: {
        status: task.status,
        priority: task.priority,
        clickupId: task.clickupId,
      },
    })),
  ];

  // Sort by timestamp and limit
  const sortedActivities = activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  res.json({
    activities: sortedActivities,
    summary: {
      totalActivities: sortedActivities.length,
      commits: recentCommits.length,
      tasks: recentTasks.length,
      dateRange: { startDate, endDate: new Date() },
    },
  });
}));

export default router;
