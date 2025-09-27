import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cron from 'node-cron';

import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { redisClient } from '@/config/redis';
import { syncGitLabData } from '@/services/gitlab';
import { syncClickUpData } from '@/services/clickup';
import { calculateProductivityMetrics } from '@/services/analytics';
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';

// Route imports
import dashboardRoutes from '@/routes/dashboard';
import userRoutes from '@/routes/users';
import projectRoutes from '@/routes/projects';
import taskRoutes from '@/routes/tasks';
import analyticsRoutes from '@/routes/analytics';
import syncRoutes from '@/routes/sync';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const SYNC_INTERVAL_HOURS = parseInt(process.env.SYNC_INTERVAL_HOURS || '1');

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// API Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/sync', syncRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis connection
    const redisStatus = redisClient.isReady ? 'connected' : 'disconnected';
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      redis: redisStatus,
      memory: process.memoryUsage(),
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
    });
  }
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'UserReports API',
    version: '1.0.0',
    description: 'API for tracking user statistics from GitLab and ClickUp',
    endpoints: {
      dashboard: '/api/dashboard',
      users: '/api/users',
      projects: '/api/projects',
      tasks: '/api/tasks',
      analytics: '/api/analytics',
      sync: '/api/sync',
    },
    documentation: {
      health: 'GET /health',
      swagger: 'GET /api/docs (coming soon)',
    },
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Scheduled data synchronization
const syncSchedule = `0 */${SYNC_INTERVAL_HOURS} * * *`; // Every N hours
cron.schedule(syncSchedule, async () => {
  logger.info('Starting scheduled data synchronization...');
  
  try {
    const syncStart = Date.now();
    
    // Run synchronization tasks in parallel
    const [gitlabResult, clickupResult] = await Promise.allSettled([
      syncGitLabData(),
      syncClickUpData(),
    ]);
    
    // Calculate productivity metrics after sync
    await calculateProductivityMetrics();
    
    const syncDuration = Date.now() - syncStart;
    
    // Log sync results
    let successCount = 0;
    let errorCount = 0;
    
    if (gitlabResult.status === 'fulfilled') {
      successCount++;
      logger.info('GitLab sync completed successfully');
    } else {
      errorCount++;
      logger.error('GitLab sync failed:', gitlabResult.reason);
    }
    
    if (clickupResult.status === 'fulfilled') {
      successCount++;
      logger.info('ClickUp sync completed successfully');
    } else {
      errorCount++;
      logger.error('ClickUp sync failed:', clickupResult.reason);
    }
    
    logger.info(`Scheduled sync completed: ${successCount} successful, ${errorCount} failed, duration: ${syncDuration}ms`);
    
  } catch (error) {
    logger.error('Scheduled sync failed:', error);
  }
});

// Manual sync is now handled by sync routes

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Close database connection
    await prisma.$disconnect();
    logger.info('Database connection closed');
    
    // Close Redis connection
    await redisClient.quit();
    logger.info('Redis connection closed');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(`📊 Sync scheduled every ${SYNC_INTERVAL_HOURS} hour(s)`);
  logger.info(`🔄 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
