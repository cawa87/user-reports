import express from 'express';
import { PrismaClient } from '@prisma/client';
import { subDays } from 'date-fns';
import { asyncHandler } from '@/middleware/errorHandler';
import { CacheService } from '@/config/redis';

const router = express.Router();
const prisma = new PrismaClient();

// Get all projects with statistics
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;
  const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
  const sortBy = req.query.sortBy as string || 'lastActivity';
  const sortOrder = req.query.sortOrder as string || 'desc';

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { namespace: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (isActive !== undefined) {
    where.isActive = isActive;
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
    case 'contributors':
      orderBy.totalContributors = sortOrder;
      break;
    case 'linesOfCode':
      orderBy.linesOfCode = sortOrder;
      break;
    case 'createdAt':
      orderBy.createdAt = sortOrder;
      break;
    default:
      orderBy.lastActivity = sortOrder;
  }

  const [projects, totalCount] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        _count: {
          select: {
            commits: true,
            codeStats: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.project.count({ where }),
  ]);

  // Add recent activity for each project
  const projectsWithActivity = await Promise.all(
    projects.map(async (project) => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      const [recentCommits, recentContributors, recentCodeStats] = await Promise.all([
        prisma.commit.count({
          where: {
            projectId: project.id,
            authorDate: { gte: thirtyDaysAgo },
          },
        }),
        prisma.commit.findMany({
          where: {
            projectId: project.id,
            authorDate: { gte: thirtyDaysAgo },
          },
          select: { userId: true },
          distinct: ['userId'],
        }),
        prisma.commit.aggregate({
          where: {
            projectId: project.id,
            authorDate: { gte: thirtyDaysAgo },
          },
          _sum: {
            additions: true,
            deletions: true,
            filesChanged: true,
          },
        }),
      ]);

      return {
        ...project,
        recentActivity: {
          commits: recentCommits,
          contributors: recentContributors.length,
          linesAdded: recentCodeStats._sum.additions || 0,
          linesDeleted: recentCodeStats._sum.deletions || 0,
          filesChanged: recentCodeStats._sum.filesChanged || 0,
        },
      };
    })
  );

  res.json({
    projects: projectsWithActivity,
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

// Get detailed project statistics
router.get('/:projectId/stats', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const period = req.query.period as string || 'monthly';
  
  const cacheKey = CacheService.keys.projectStats(projectId);
  const cached = await CacheService.get(cacheKey);
  
  if (cached) {
    return res.json(cached);
  }

  // Get project basic info
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      _count: {
        select: {
          commits: true,
          codeStats: true,
        },
      },
    },
  });

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
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
    contributors,
    codeStats,
    dailyActivity
  ] = await Promise.all([
    prisma.commit.findMany({
      where: {
        projectId,
        authorDate: { gte: startDate },
      },
      include: {
        user: {
          select: { name: true, username: true, avatar: true },
        },
      },
      orderBy: { authorDate: 'desc' },
      take: 100,
    }),
    prisma.commit.groupBy({
      by: ['userId'],
      where: {
        projectId,
        authorDate: { gte: startDate },
      },
      _count: { id: true },
      _sum: {
        additions: true,
        deletions: true,
        filesChanged: true,
      },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.codeStats.findMany({
      where: {
        projectId,
        date: { gte: startDate },
      },
      include: {
        user: {
          select: { name: true, username: true },
        },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.commit.groupBy({
      by: ['authorDate'],
      where: {
        projectId,
        authorDate: { gte: startDate },
      },
      _count: { id: true },
      _sum: {
        additions: true,
        deletions: true,
      },
      orderBy: { authorDate: 'asc' },
    }),
  ]);

  // Get contributor details
  const contributorsWithDetails = await Promise.all(
    contributors.map(async (contributor) => {
      const user = await prisma.user.findUnique({
        where: { id: contributor.userId },
        select: { name: true, username: true, avatar: true },
      });
      return {
        user,
        commits: contributor._count.id,
        linesAdded: contributor._sum.additions || 0,
        linesDeleted: contributor._sum.deletions || 0,
        filesChanged: contributor._sum.filesChanged || 0,
      };
    })
  );

  // Calculate aggregated statistics
  const stats = {
    commits: {
      total: commits.length,
      linesAdded: commits.reduce((sum, c) => sum + c.additions, 0),
      linesDeleted: commits.reduce((sum, c) => sum + c.deletions, 0),
      filesChanged: commits.reduce((sum, c) => sum + c.filesChanged, 0),
      contributors: contributors.length,
    },
    activity: {
      dailyCommits: dailyActivity.map(day => ({
        date: day.authorDate,
        commits: day._count.id,
        linesAdded: day._sum.additions || 0,
        linesDeleted: day._sum.deletions || 0,
      })),
      topContributors: contributorsWithDetails.slice(0, 10),
    },
    trends: {
      // Calculate weekly trends
      weeklyCommits: 0,
      weeklyLinesAdded: 0,
      weeklyContributors: 0,
    },
  };

  // Calculate weekly trends
  const weeklyStartDate = subDays(new Date(), 7);
  const weeklyCommits = commits.filter(c => c.authorDate >= weeklyStartDate);
  const weeklyContributorIds = new Set(weeklyCommits.map(c => c.userId));
  
  stats.trends.weeklyCommits = weeklyCommits.length;
  stats.trends.weeklyLinesAdded = weeklyCommits.reduce((sum, c) => sum + c.additions, 0);
  stats.trends.weeklyContributors = weeklyContributorIds.size;

  const projectStats = {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      namespace: project.namespace,
      visibility: project.visibility,
      gitlabUrl: project.gitlabUrl,
      isActive: project.isActive,
      createdAt: project.createdAt,
      lastActivity: project.lastActivity,
      totalCommits: project.totalCommits,
      totalContributors: project.totalContributors,
      linesOfCode: project.linesOfCode,
    },
    stats,
    recentCommits: commits.slice(0, 20),
    codeStats,
    period,
    lastUpdated: new Date().toISOString(),
  };

  // Cache for 15 minutes
  await CacheService.set(cacheKey, projectStats, 900);
  
  res.json(projectStats);
}));

// Get project contributors
router.get('/:projectId/contributors', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : subDays(new Date(), 30);
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

  const contributors = await prisma.commit.groupBy({
    by: ['userId'],
    where: {
      projectId,
      authorDate: { gte: startDate, lte: endDate },
    },
    _count: { id: true },
    _sum: {
      additions: true,
      deletions: true,
      filesChanged: true,
    },
    orderBy: { _count: { id: 'desc' } },
  });

  const contributorsWithDetails = await Promise.all(
    contributors.map(async (contributor) => {
      const user = await prisma.user.findUnique({
        where: { id: contributor.userId },
        select: { 
          id: true,
          name: true, 
          username: true, 
          avatar: true,
          email: true,
        },
      });
      
      // Get first and last commit dates for this contributor
      const [firstCommit, lastCommit] = await Promise.all([
        prisma.commit.findFirst({
          where: { userId: contributor.userId, projectId },
          orderBy: { authorDate: 'asc' },
          select: { authorDate: true },
        }),
        prisma.commit.findFirst({
          where: { userId: contributor.userId, projectId },
          orderBy: { authorDate: 'desc' },
          select: { authorDate: true },
        }),
      ]);

      return {
        user,
        stats: {
          commits: contributor._count.id,
          linesAdded: contributor._sum.additions || 0,
          linesDeleted: contributor._sum.deletions || 0,
          filesChanged: contributor._sum.filesChanged || 0,
          firstCommit: firstCommit?.authorDate,
          lastCommit: lastCommit?.authorDate,
        },
      };
    })
  );

  res.json({
    contributors: contributorsWithDetails,
    summary: {
      totalContributors: contributors.length,
      totalCommits: contributors.reduce((sum, c) => sum + c._count.id, 0),
      totalLinesAdded: contributors.reduce((sum, c) => sum + (c._sum.additions || 0), 0),
      totalLinesDeleted: contributors.reduce((sum, c) => sum + (c._sum.deletions || 0), 0),
      dateRange: { startDate, endDate },
    },
  });
}));

// Get project commits
router.get('/:projectId/commits', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const userId = req.query.userId as string;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : subDays(new Date(), 30);
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

  const skip = (page - 1) * limit;

  const where: any = {
    projectId,
    authorDate: { gte: startDate, lte: endDate },
  };
  
  if (userId) {
    where.userId = userId;
  }

  const [commits, totalCount] = await Promise.all([
    prisma.commit.findMany({
      where,
      include: {
        user: {
          select: { name: true, username: true, avatar: true },
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

export default router;
