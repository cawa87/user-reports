import express from 'express';
import { PrismaClient, TaskStatus, TaskPriority } from '@prisma/client';
import { subDays } from 'date-fns';
import { asyncHandler } from '@/middleware/errorHandler';
import { CacheService } from '@/config/redis';

const router = express.Router();
const prisma = new PrismaClient();

// Get all tasks with filtering and pagination
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;
  const status = req.query.status as TaskStatus;
  const priority = req.query.priority as TaskPriority;
  const assigneeId = req.query.assigneeId as string;
  const spaceId = req.query.spaceId as string;
  const sortBy = req.query.sortBy as string || 'updatedAt';
  const sortOrder = req.query.sortOrder as string || 'desc';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : subDays(new Date(), 30);
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {
    updatedAt: { gte: startDate, lte: endDate },
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (spaceId) where.spaceId = spaceId;

  // Build order by clause
  const orderBy: any = {};
  switch (sortBy) {
    case 'name':
      orderBy.name = sortOrder;
      break;
    case 'status':
      orderBy.status = sortOrder;
      break;
    case 'priority':
      orderBy.priority = sortOrder;
      break;
    case 'dueDate':
      orderBy.dueDate = sortOrder;
      break;
    case 'timeSpent':
      orderBy.timeSpent = sortOrder;
      break;
    case 'createdAt':
      orderBy.createdAt = sortOrder;
      break;
    default:
      orderBy.updatedAt = sortOrder;
  }

  const [tasks, totalCount] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { 
            id: true,
            name: true, 
            username: true, 
            avatar: true 
          },
        },
        _count: {
          select: {
            timeEntries: true,
          },
        },
      },
      orderBy,
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

// Get task analytics and statistics
router.get('/analytics', asyncHandler(async (req, res) => {
  const period = req.query.period as string || 'monthly';
  const spaceId = req.query.spaceId as string;
  
  const cacheKey = `${CacheService.keys.taskStats}:${period}:${spaceId || 'all'}`;
  const cached = await CacheService.get(cacheKey);
  
  if (cached) {
    return res.json(cached);
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

  const where: any = {
    updatedAt: { gte: startDate },
  };
  if (spaceId) where.spaceId = spaceId;

  // Get basic task statistics
  const [
    totalTasks,
    tasksByStatus,
    tasksByPriority,
    completedTasks,
    overdueTasks,
    avgCompletionTime,
    totalTimeSpent
  ] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    }),
    prisma.task.groupBy({
      by: ['priority'],
      where,
      _count: { id: true },
    }),
    prisma.task.findMany({
      where: {
        ...where,
        status: { in: ['DONE', 'CLOSED'] },
        completedAt: { not: null },
      },
      select: {
        createdAt: true,
        completedAt: true,
        timeSpent: true,
      },
    }),
    prisma.task.count({
      where: {
        ...where,
        dueDate: { lt: new Date() },
        status: { notIn: ['DONE', 'CLOSED'] },
      },
    }),
    prisma.task.aggregate({
      where: {
        ...where,
        status: { in: ['DONE', 'CLOSED'] },
        completedAt: { not: null },
      },
      _avg: { timeSpent: true },
    }),
    prisma.task.aggregate({
      where,
      _sum: { timeSpent: true },
    }),
  ]);

  // Calculate completion time statistics
  const completionTimes = completedTasks
    .filter(task => task.completedAt)
    .map(task => {
      const completionTimeMs = task.completedAt!.getTime() - task.createdAt.getTime();
      return completionTimeMs / (1000 * 60 * 60 * 24); // Convert to days
    });

  const avgCompletionDays = completionTimes.length > 0
    ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
    : 0;

  // Get top performers (by completed tasks)
  const topPerformers = await prisma.task.groupBy({
    by: ['assigneeId'],
    where: {
      ...where,
      status: { in: ['DONE', 'CLOSED'] },
    },
    _count: { id: true },
    _sum: { timeSpent: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const topPerformersWithDetails = await Promise.all(
    topPerformers.map(async (performer) => {
      const user = await prisma.user.findUnique({
        where: { id: performer.assigneeId },
        select: { name: true, username: true, avatar: true },
      });
      return {
        user,
        tasksCompleted: performer._count.id,
        timeSpent: performer._sum.timeSpent || 0,
      };
    })
  );

  // Get task completion trends (daily)
  const dailyCompletions = await prisma.task.groupBy({
    by: ['completedAt'],
    where: {
      ...where,
      status: { in: ['DONE', 'CLOSED'] },
      completedAt: { not: null },
    },
    _count: { id: true },
    orderBy: { completedAt: 'asc' },
  });

  // Process daily completions data
  const completionTrends = [];
  for (let i = 29; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const dayCompletions = dailyCompletions.filter(
      completion => completion.completedAt && 
        completion.completedAt >= dayStart && 
        completion.completedAt < dayEnd
    ).reduce((sum, completion) => sum + completion._count.id, 0);
    
    completionTrends.push({
      date: dayStart.toISOString().split('T')[0],
      completed: dayCompletions,
    });
  }

  // Calculate task velocity (tasks completed per day)
  const totalCompletedInPeriod = completedTasks.length;
  const daysInPeriod = Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const taskVelocity = daysInPeriod > 0 ? totalCompletedInPeriod / daysInPeriod : 0;

  const analytics = {
    overview: {
      totalTasks,
      completedTasks: totalCompletedInPeriod,
      completionRate: totalTasks > 0 ? (totalCompletedInPeriod / totalTasks) * 100 : 0,
      overdueTasks,
      totalTimeSpent: totalTimeSpent._sum.timeSpent || 0,
      avgCompletionTime: avgCompletionTime._avg.timeSpent || 0,
      avgCompletionDays,
      taskVelocity,
    },
    breakdown: {
      byStatus: tasksByStatus.map(status => ({
        status: status.status,
        count: status._count.id,
        percentage: totalTasks > 0 ? (status._count.id / totalTasks) * 100 : 0,
      })),
      byPriority: tasksByPriority.map(priority => ({
        priority: priority.priority || 'NONE',
        count: priority._count.id,
        percentage: totalTasks > 0 ? (priority._count.id / totalTasks) * 100 : 0,
      })),
    },
    trends: {
      dailyCompletions: completionTrends,
      topPerformers: topPerformersWithDetails,
    },
    period,
    lastUpdated: new Date().toISOString(),
  };

  // Cache for 30 minutes
  await CacheService.set(cacheKey, analytics, 1800);
  
  res.json(analytics);
}));

// Get task details
router.get('/:taskId', asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  
  const task = await prisma.task.findUnique({
    where: { clickupId: taskId },
    include: {
      assignee: {
        select: { 
          id: true,
          name: true, 
          username: true, 
          avatar: true,
          email: true,
        },
      },
      timeEntries: {
        include: {
          user: {
            select: { name: true, username: true, avatar: true },
          },
        },
        orderBy: { startTime: 'desc' },
      },
    },
  });

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
}));

// Get task time tracking
router.get('/:taskId/time', asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  
  // First find the internal task ID
  const task = await prisma.task.findUnique({
    where: { clickupId: taskId },
    select: { id: true, name: true },
  });

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const [timeEntries, totalTime] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { taskId: task.id },
      include: {
        user: {
          select: { name: true, username: true, avatar: true },
        },
      },
      orderBy: { startTime: 'desc' },
    }),
    prisma.timeEntry.aggregate({
      where: { taskId: task.id },
      _sum: { duration: true },
    }),
  ]);

  res.json({
    task: {
      id: taskId,
      name: task.name,
    },
    timeEntries,
    summary: {
      totalTime: totalTime._sum.duration || 0,
      totalEntries: timeEntries.length,
      avgSessionLength: timeEntries.length > 0 
        ? (totalTime._sum.duration || 0) / timeEntries.length 
        : 0,
    },
  });
}));

// Get tasks by space
router.get('/space/:spaceId', asyncHandler(async (req, res) => {
  const { spaceId } = req.params;
  const status = req.query.status as TaskStatus;
  const priority = req.query.priority as TaskPriority;
  const assigneeId = req.query.assigneeId as string;

  const where: any = { spaceId };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;

  const [tasks, taskStats] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { 
            id: true,
            name: true, 
            username: true, 
            avatar: true 
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    }),
    prisma.task.groupBy({
      by: ['status'],
      where: { spaceId },
      _count: { id: true },
    }),
  ]);

  res.json({
    tasks,
    stats: {
      total: tasks.length,
      byStatus: taskStats.map(stat => ({
        status: stat.status,
        count: stat._count.id,
      })),
    },
  });
}));

export default router;
