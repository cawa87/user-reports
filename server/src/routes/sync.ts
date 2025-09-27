import express from 'express';
import { PrismaClient, SyncService, SyncStatus } from '@prisma/client';
import { asyncHandler } from '@/middleware/errorHandler';
import { syncGitLabData } from '@/services/gitlab';
import { syncClickUpData } from '@/services/clickup';
import { calculateProductivityMetrics } from '@/services/analytics';
import { syncLogger } from '@/utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

// Manual sync trigger
router.post('/manual', asyncHandler(async (req, res) => {
  const services = req.body.services as string[] || ['gitlab', 'clickup'];
  
  syncLogger.info('Manual sync triggered', { services, user: req.ip });
  
  const syncResults = [];
  
  for (const service of services) {
    const startTime = new Date();
    let syncLog;
    
    try {
      // Create sync log entry
      syncLog = await prisma.syncLog.create({
        data: {
          service: service.toUpperCase() as SyncService,
          status: 'RUNNING',
          startedAt: startTime,
        },
      });

      let recordsProcessed = 0;
      
      // Execute sync based on service
      switch (service.toLowerCase()) {
        case 'gitlab':
          await syncGitLabData();
          // Count recent records (approximate)
          recordsProcessed = await prisma.commit.count({
            where: { createdAt: { gte: startTime } },
          });
          break;
          
        case 'clickup':
          await syncClickUpData();
          // Count recent records (approximate)
          recordsProcessed = await prisma.task.count({
            where: { updatedAt: { gte: startTime } },
          });
          break;
          
        default:
          throw new Error(`Unknown service: ${service}`);
      }
      
      // Update sync log with success
      const duration = Date.now() - startTime.getTime();
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          duration,
          recordsProcessed,
          message: `Successfully synced ${recordsProcessed} records`,
        },
      });
      
      syncResults.push({
        service,
        status: 'success',
        duration,
        recordsProcessed,
        message: `Successfully synced ${recordsProcessed} records`,
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const duration = Date.now() - startTime.getTime();
      
      // Update sync log with error
      if (syncLog) {
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            duration,
            message: errorMessage,
            errorDetails: {
              error: errorMessage,
              stack: error instanceof Error ? error.stack : undefined,
            },
          },
        });
      }
      
      syncResults.push({
        service,
        status: 'failed',
        duration,
        error: errorMessage,
      });
      
      syncLogger.error(`Manual sync failed for ${service}:`, error);
    }
  }
  
  // Calculate productivity metrics after sync
  try {
    await calculateProductivityMetrics();
    syncLogger.info('Productivity metrics calculated after manual sync');
  } catch (error) {
    syncLogger.error('Failed to calculate productivity metrics after sync:', error);
  }
  
  res.json({
    message: 'Manual sync completed',
    results: syncResults,
    timestamp: new Date().toISOString(),
  });
}));

// Get sync status and logs
router.get('/status', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const service = req.query.service as SyncService;
  const status = req.query.status as SyncStatus;
  
  const where: any = {};
  if (service) where.service = service;
  if (status) where.status = status;
  
  const [syncLogs, runningSyncs, lastSuccessfulSync] = await Promise.all([
    prisma.syncLog.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit,
    }),
    prisma.syncLog.count({
      where: { status: 'RUNNING' },
    }),
    prisma.syncLog.findFirst({
      where: { status: 'SUCCESS' },
      orderBy: { completedAt: 'desc' },
    }),
  ]);
  
  // Get sync statistics
  const stats = await prisma.syncLog.groupBy({
    by: ['service', 'status'],
    _count: { id: true },
  });
  
  const syncStats = stats.reduce((acc: any, stat) => {
    if (!acc[stat.service]) {
      acc[stat.service] = { total: 0, success: 0, failed: 0, running: 0, partial: 0 };
    }
    acc[stat.service][stat.status.toLowerCase()] = stat._count.id;
    acc[stat.service].total += stat._count.id;
    return acc;
  }, {});
  
  res.json({
    status: {
      isRunning: runningSyncs > 0,
      runningSyncs,
      lastSuccessfulSync: lastSuccessfulSync?.completedAt,
    },
    logs: syncLogs,
    statistics: syncStats,
  });
}));

// Get sync statistics
router.get('/statistics', asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const [
    totalSyncs,
    successfulSyncs,
    failedSyncs,
    avgDuration,
    totalRecordsProcessed,
    syncsByService,
    dailySyncs
  ] = await Promise.all([
    prisma.syncLog.count({
      where: { startedAt: { gte: startDate } },
    }),
    prisma.syncLog.count({
      where: { 
        startedAt: { gte: startDate },
        status: 'SUCCESS',
      },
    }),
    prisma.syncLog.count({
      where: { 
        startedAt: { gte: startDate },
        status: 'FAILED',
      },
    }),
    prisma.syncLog.aggregate({
      where: { 
        startedAt: { gte: startDate },
        duration: { not: null },
      },
      _avg: { duration: true },
    }),
    prisma.syncLog.aggregate({
      where: { startedAt: { gte: startDate } },
      _sum: { recordsProcessed: true },
    }),
    prisma.syncLog.groupBy({
      by: ['service'],
      where: { startedAt: { gte: startDate } },
      _count: { id: true },
      _sum: { recordsProcessed: true },
    }),
    prisma.syncLog.groupBy({
      by: ['startedAt'],
      where: { startedAt: { gte: startDate } },
      _count: { id: true },
      orderBy: { startedAt: 'asc' },
    }),
  ]);
  
  const successRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0;
  
  res.json({
    period: `${days} days`,
    overview: {
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      successRate,
      avgDuration: avgDuration._avg.duration || 0,
      totalRecordsProcessed: totalRecordsProcessed._sum.recordsProcessed || 0,
    },
    byService: syncsByService.map(service => ({
      service: service.service,
      syncs: service._count.id,
      recordsProcessed: service._sum.recordsProcessed || 0,
    })),
    dailyActivity: dailySyncs.map(day => ({
      date: day.startedAt.toISOString().split('T')[0],
      syncs: day._count.id,
    })),
  });
}));

// Cancel running sync (placeholder - would need more complex implementation)
router.post('/cancel', asyncHandler(async (req, res) => {
  const { syncId } = req.body;
  
  if (!syncId) {
    return res.status(400).json({ error: 'syncId is required' });
  }
  
  // In a real implementation, you'd need to track and cancel running sync processes
  // For now, we'll just mark the sync as cancelled in the database
  
  const sync = await prisma.syncLog.findUnique({
    where: { id: syncId },
  });
  
  if (!sync) {
    return res.status(404).json({ error: 'Sync not found' });
  }
  
  if (sync.status !== 'RUNNING') {
    return res.status(400).json({ error: 'Sync is not running' });
  }
  
  await prisma.syncLog.update({
    where: { id: syncId },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
      message: 'Cancelled by user',
      duration: Date.now() - sync.startedAt.getTime(),
    },
  });
  
  res.json({ message: 'Sync cancelled successfully' });
}));

// Get sync configuration and health
router.get('/health', asyncHandler(async (req, res) => {
  // Check if required environment variables are set
  const gitlabConfig = {
    url: !!process.env.GITLAB_URL,
    token: !!process.env.GITLAB_ACCESS_TOKEN,
    configured: !!(process.env.GITLAB_URL && process.env.GITLAB_ACCESS_TOKEN),
  };
  
  const clickupConfig = {
    token: !!process.env.CLICKUP_API_TOKEN,
    teamId: !!process.env.CLICKUP_TEAM_ID,
    configured: !!(process.env.CLICKUP_API_TOKEN && process.env.CLICKUP_TEAM_ID),
  };
  
  // Get last sync status for each service
  const [lastGitlabSync, lastClickupSync] = await Promise.all([
    prisma.syncLog.findFirst({
      where: { service: 'GITLAB' },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.syncLog.findFirst({
      where: { service: 'CLICKUP' },
      orderBy: { startedAt: 'desc' },
    }),
  ]);
  
  res.json({
    services: {
      gitlab: {
        ...gitlabConfig,
        lastSync: lastGitlabSync?.startedAt,
        lastStatus: lastGitlabSync?.status,
      },
      clickup: {
        ...clickupConfig,
        lastSync: lastClickupSync?.startedAt,
        lastStatus: lastClickupSync?.status,
      },
    },
    syncInterval: process.env.SYNC_INTERVAL_HOURS || '1',
    isHealthy: gitlabConfig.configured && clickupConfig.configured,
  });
}));

// Individual service sync endpoints
router.post('/gitlab', asyncHandler(async (req, res) => {
  syncLogger.info('GitLab sync triggered', { user: req.ip });
  
  const startTime = new Date();
  let syncLog;
  
  try {
    // Create sync log entry
    syncLog = await prisma.syncLog.create({
      data: {
        service: 'GITLAB',
        status: 'RUNNING',
        startedAt: startTime,
      },
    });

    await syncGitLabData();
    
    // Count recent records
    const recordsProcessed = await prisma.commit.count({
      where: { createdAt: { gte: startTime } },
    });
    
    // Update sync log with success
    const duration = Date.now() - startTime.getTime();
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
        duration,
        recordsProcessed,
        message: `Successfully synced ${recordsProcessed} GitLab records`,
      },
    });
    
    res.json({
      message: 'GitLab sync completed successfully',
      status: 'success',
      duration,
      recordsProcessed,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime.getTime();
    
    // Update sync log with error
    if (syncLog) {
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          duration,
          message: errorMessage,
          errorDetails: {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          },
        },
      });
    }
    
    syncLogger.error('GitLab sync failed:', error);
    res.status(500).json({
      message: 'GitLab sync failed',
      status: 'failed',
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}));

router.post('/clickup', asyncHandler(async (req, res) => {
  syncLogger.info('ClickUp sync triggered', { user: req.ip });
  
  const startTime = new Date();
  let syncLog;
  
  try {
    // Create sync log entry
    syncLog = await prisma.syncLog.create({
      data: {
        service: 'CLICKUP',
        status: 'RUNNING',
        startedAt: startTime,
      },
    });

    await syncClickUpData();
    
    // Count recent records
    const recordsProcessed = await prisma.task.count({
      where: { updatedAt: { gte: startTime } },
    });
    
    // Update sync log with success
    const duration = Date.now() - startTime.getTime();
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
        duration,
        recordsProcessed,
        message: `Successfully synced ${recordsProcessed} ClickUp records`,
      },
    });
    
    res.json({
      message: 'ClickUp sync completed successfully',
      status: 'success',
      duration,
      recordsProcessed,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime.getTime();
    
    // Update sync log with error
    if (syncLog) {
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          duration,
          message: errorMessage,
          errorDetails: {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          },
        },
      });
    }
    
    syncLogger.error('ClickUp sync failed:', error);
    res.status(500).json({
      message: 'ClickUp sync failed',
      status: 'failed',
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}));

export default router;
