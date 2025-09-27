import { PrismaClient } from '@prisma/client';
import { syncLogger } from '@/utils/logger';

const prisma = new PrismaClient();

async function seed() {
  try {
    syncLogger.info('Starting database seed...');

    // Create a system user for unassigned tasks
    const systemUser = await prisma.user.upsert({
      where: { email: 'system@userreports.local' },
      update: {},
      create: {
        email: 'system@userreports.local',
        username: 'system',
        name: 'System User',
        isActive: false,
      },
    });

    syncLogger.info('System user created:', { id: systemUser.id });

    // Initialize system metrics for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.systemMetrics.upsert({
      where: { date: today },
      update: {},
      create: {
        date: today,
        totalUsers: 1,
        activeUsers: 0,
        newUsers: 1,
        totalCommits: 0,
        totalProjects: 0,
        linesOfCode: 0,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        totalTimeTracked: 0,
      },
    });

    syncLogger.info('System metrics initialized');
    syncLogger.info('Database seed completed successfully');
  } catch (error) {
    syncLogger.error('Database seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seed().catch((error) => {
  console.error('Seed script failed:', error);
  process.exit(1);
});
