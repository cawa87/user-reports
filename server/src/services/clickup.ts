import axios, { AxiosInstance } from 'axios';
import { PrismaClient, TaskStatus, TaskPriority } from '@prisma/client';
import { format, subDays, startOfDay } from 'date-fns';
import { syncLogger } from '@/utils/logger';
import { CacheService } from '@/config/redis';

const prisma = new PrismaClient();

interface ClickUpConfig {
  apiToken: string;
  teamId: string;
  spaceIds: string[];
}

interface ClickUpTeam {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

interface ClickUpSpace {
  id: string;
  name: string;
  color?: string;
  private: boolean;
  statuses: ClickUpStatus[];
  features: {
    due_dates: { enabled: boolean };
    time_tracking: { enabled: boolean };
    tags: { enabled: boolean };
    time_estimates: { enabled: boolean };
  };
}

interface ClickUpStatus {
  status: string;
  type: 'open' | 'custom' | 'closed';
  orderindex: number;
  color: string;
}

interface ClickUpList {
  id: string;
  name: string;
  orderindex: number;
  content: string;
  status?: ClickUpStatus;
  priority?: ClickUpPriority;
  assignee?: ClickUpUser;
  task_count: number;
  due_date?: string;
  start_date?: string;
  folder: {
    id: string;
    name: string;
  };
  space: {
    id: string;
    name: string;
  };
}

interface ClickUpPriority {
  priority: 'urgent' | 'high' | 'normal' | 'low';
  color: string;
}

interface ClickUpUser {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture?: string;
  initials: string;
  role: number;
}

interface ClickUpTask {
  id: string;
  custom_id?: string;
  name: string;
  text_content?: string;
  description?: string;
  status: ClickUpStatus;
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed?: string;
  creator: ClickUpUser;
  assignees: ClickUpUser[];
  watchers: ClickUpUser[];
  checklists: any[];
  tags: ClickUpTag[];
  parent?: string;
  priority?: ClickUpPriority;
  due_date?: string;
  start_date?: string;
  time_estimate?: number; // in milliseconds
  time_spent?: number; // in milliseconds
  list: {
    id: string;
    name: string;
  };
  project: {
    id: string;
    name: string;
  };
  folder: {
    id: string;
    name: string;
  };
  space: {
    id: string;
    name: string;
  };
  url: string;
}

interface ClickUpTag {
  name: string;
  tag_fg: string;
  tag_bg: string;
}

interface ClickUpTimeEntry {
  id: string;
  task: {
    id: string;
    name: string;
  };
  wid: string;
  user: ClickUpUser;
  billable: boolean;
  start: string; // timestamp in milliseconds
  end?: string; // timestamp in milliseconds
  duration: string; // in milliseconds
  description: string;
  source: string;
  at: string; // created at timestamp
}

class ClickUpService {
  private api: AxiosInstance;
  private config: ClickUpConfig;

  constructor() {
    this.config = {
      apiToken: process.env.CLICKUP_API_TOKEN || '',
      teamId: process.env.CLICKUP_TEAM_ID || '',
      spaceIds: (process.env.CLICKUP_SPACE_IDS || '').split(',').map(id => id.trim()).filter(Boolean),
    };

    if (!this.config.apiToken || !this.config.teamId) {
      throw new Error('ClickUp configuration is incomplete. Please set CLICKUP_API_TOKEN and CLICKUP_TEAM_ID');
    }

    this.api = axios.create({
      baseURL: 'https://api.clickup.com/api/v2',
      headers: {
        'Authorization': this.config.apiToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        syncLogger.error('ClickUp API error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          headers: error.config?.headers,
        });
        throw error;
      }
    );
  }

  async syncAllData(): Promise<void> {
    syncLogger.info('Starting ClickUp data synchronization');
    
    try {
      // Get team information
      const team = await this.getTeamInfo();
      syncLogger.info(`Syncing ClickUp team: ${team.name}`);

      // Get spaces to sync
      const spacesToSync = this.config.spaceIds.length > 0 
        ? this.config.spaceIds 
        : await this.getAllSpaceIds();

      syncLogger.info(`Syncing ${spacesToSync.length} ClickUp spaces`);

      // Sync spaces in parallel (with concurrency limit)
      const concurrency = 2; // ClickUp has stricter rate limits
      for (let i = 0; i < spacesToSync.length; i += concurrency) {
        const batch = spacesToSync.slice(i, i + concurrency);
        await Promise.all(batch.map(spaceId => this.syncSpace(spaceId)));
      }

      // Sync time tracking entries
      await this.syncTimeEntries();

      // Update system metrics
      await this.updateSystemMetrics();

      syncLogger.info('ClickUp data synchronization completed successfully');
    } catch (error) {
      syncLogger.error('ClickUp synchronization failed:', error);
      throw error;
    }
  }

  private async getTeamInfo(): Promise<ClickUpTeam> {
    try {
      const response = await this.api.get(`/team/${this.config.teamId}`);
      return response.data.team;
    } catch (error) {
      syncLogger.error('Failed to get team info:', error);
      throw error;
    }
  }

  private async getAllSpaceIds(): Promise<string[]> {
    try {
      const response = await this.api.get(`/team/${this.config.teamId}/space`);
      return response.data.spaces.map((space: ClickUpSpace) => space.id);
    } catch (error) {
      syncLogger.error('Failed to get team spaces:', error);
      return [];
    }
  }

  private async syncSpace(spaceId: string): Promise<void> {
    try {
      syncLogger.info(`Syncing ClickUp space ${spaceId}`);

      // Get space details
      const space = await this.getSpaceDetails(spaceId);
      if (!space) {
        syncLogger.warn(`Space ${spaceId} not found or not accessible`);
        return;
      }

      // Get all lists in the space
      const lists = await this.getSpaceLists(spaceId);
      
      // Sync tasks for each list
      for (const list of lists) {
        await this.syncListTasks(list.id, spaceId);
        
        // Rate limiting for ClickUp
        await this.sleep(200); // 200ms delay
      }

      syncLogger.info(`Successfully synced ClickUp space ${spaceId}: ${space.name}`);
    } catch (error) {
      syncLogger.error(`Failed to sync ClickUp space ${spaceId}:`, error);
    }
  }

  private async getSpaceDetails(spaceId: string): Promise<ClickUpSpace | null> {
    try {
      const response = await this.api.get(`/space/${spaceId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  private async getSpaceLists(spaceId: string): Promise<ClickUpList[]> {
    try {
      const response = await this.api.get(`/space/${spaceId}/list`);
      return response.data.lists || [];
    } catch (error) {
      syncLogger.error(`Failed to get lists for space ${spaceId}:`, error);
      return [];
    }
  }

  private async syncListTasks(listId: string, spaceId: string): Promise<void> {
    try {
      const since = Date.now() - (30 * 24 * 60 * 60 * 1000); // Last 30 days
      let page = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await this.api.get(`/list/${listId}/task`, {
          params: {
            include_closed: true,
            date_updated_gt: since,
            page,
            limit,
            include_subtasks: true,
          },
        });

        const tasks = response.data.tasks || [];
        
        if (tasks.length === 0) {
          hasMore = false;
          break;
        }

        for (const task of tasks) {
          await this.processTask(task, spaceId);
        }

        page++;
        hasMore = tasks.length === limit;

        // Rate limiting
        await this.sleep(300); // 300ms delay between requests
      }
    } catch (error) {
      syncLogger.error(`Failed to sync tasks for list ${listId}:`, error);
    }
  }

  private async processTask(task: ClickUpTask, spaceId: string): Promise<void> {
    try {
      // Process all assignees
      for (const assignee of task.assignees) {
        // Find or create user
        const user = await this.findOrCreateUser(assignee);
        
        // Map ClickUp status to our enum
        const status = this.mapClickUpStatus(task.status.status);
        const priority = this.mapClickUpPriority(task.priority?.priority);
        
        // Convert timestamps
        const timeEstimate = task.time_estimate ? Math.round(task.time_estimate / 60000) : null; // Convert to minutes
        const timeSpent = task.time_spent ? Math.round(task.time_spent / 60000) : null; // Convert to minutes
        const dueDate = task.due_date ? new Date(parseInt(task.due_date)) : null;
        const startDate = task.start_date ? new Date(parseInt(task.start_date)) : null;
        const completedAt = task.date_closed ? new Date(parseInt(task.date_closed)) : null;

        // Upsert task
        await prisma.task.upsert({
          where: { clickupId: task.id },
          update: {
            name: task.name,
            description: task.text_content || task.description || null,
            status,
            priority,
            dueDate,
            startDate,
            timeEstimate,
            timeSpent,
            completedAt,
            updatedAt: new Date(parseInt(task.date_updated)),
            listId: task.list.id,
            spaceId,
            folderId: task.folder?.id || null,
          },
          create: {
            clickupId: task.id,
            name: task.name,
            description: task.text_content || task.description || null,
            status,
            priority,
            dueDate,
            startDate,
            timeEstimate,
            timeSpent,
            completedAt,
            assigneeId: user.id,
            listId: task.list.id,
            spaceId,
            folderId: task.folder?.id || null,
            createdAt: new Date(parseInt(task.date_created)),
            updatedAt: new Date(parseInt(task.date_updated)),
          },
        });

        // Update user statistics
        await this.updateUserTaskStatistics(user.id);
      }

      // If no assignees, still track the task but assign to a system user
      if (task.assignees.length === 0) {
        const systemUser = await this.findOrCreateSystemUser();
        
        const status = this.mapClickUpStatus(task.status.status);
        const priority = this.mapClickUpPriority(task.priority?.priority);
        const timeEstimate = task.time_estimate ? Math.round(task.time_estimate / 60000) : null;
        const timeSpent = task.time_spent ? Math.round(task.time_spent / 60000) : null;
        const dueDate = task.due_date ? new Date(parseInt(task.due_date)) : null;
        const startDate = task.start_date ? new Date(parseInt(task.start_date)) : null;
        const completedAt = task.date_closed ? new Date(parseInt(task.date_closed)) : null;

        await prisma.task.upsert({
          where: { clickupId: task.id },
          update: {
            name: task.name,
            description: task.text_content || task.description || null,
            status,
            priority,
            dueDate,
            startDate,
            timeEstimate,
            timeSpent,
            completedAt,
            updatedAt: new Date(parseInt(task.date_updated)),
            listId: task.list.id,
            spaceId,
            folderId: task.folder?.id || null,
          },
          create: {
            clickupId: task.id,
            name: task.name,
            description: task.text_content || task.description || null,
            status,
            priority,
            dueDate,
            startDate,
            timeEstimate,
            timeSpent,
            completedAt,
            assigneeId: systemUser.id,
            listId: task.list.id,
            spaceId,
            folderId: task.folder?.id || null,
            createdAt: new Date(parseInt(task.date_created)),
            updatedAt: new Date(parseInt(task.date_updated)),
          },
        });
      }

    } catch (error) {
      syncLogger.error(`Failed to process task ${task.id}:`, error);
    }
  }

  private async syncTimeEntries(): Promise<void> {
    try {
      syncLogger.info('Syncing ClickUp time entries');

      const since = Date.now() - (30 * 24 * 60 * 60 * 1000); // Last 30 days
      
      const response = await this.api.get(`/team/${this.config.teamId}/time_entries`, {
        params: {
          start_date: since,
          end_date: Date.now(),
          include_task_tags: true,
          include_location_names: true,
        },
      });

      const timeEntries = response.data.data || [];

      for (const entry of timeEntries) {
        await this.processTimeEntry(entry);
      }

      syncLogger.info(`Synced ${timeEntries.length} time entries`);
    } catch (error) {
      syncLogger.error('Failed to sync time entries:', error);
    }
  }

  private async processTimeEntry(entry: ClickUpTimeEntry): Promise<void> {
    try {
      // Find or create user
      const user = await this.findOrCreateUser(entry.user);
      
      // Find related task if exists
      let taskId: string | null = null;
      if (entry.task?.id) {
        const task = await prisma.task.findUnique({
          where: { clickupId: entry.task.id },
        });
        taskId = task?.id || null;
      }

      const duration = Math.round(parseInt(entry.duration) / 60000); // Convert to minutes
      const startTime = new Date(parseInt(entry.start));
      const endTime = entry.end ? new Date(parseInt(entry.end)) : null;

      await prisma.timeEntry.upsert({
        where: { clickupId: entry.id },
        update: {
          description: entry.description || null,
          duration,
          startTime,
          endTime,
        },
        create: {
          clickupId: entry.id,
          description: entry.description || null,
          duration,
          startTime,
          endTime,
          userId: user.id,
          taskId,
          createdAt: new Date(parseInt(entry.at)),
        },
      });

      // Update user time statistics
      await this.updateUserTimeStatistics(user.id);

    } catch (error) {
      syncLogger.error(`Failed to process time entry ${entry.id}:`, error);
    }
  }

  private async findOrCreateUser(clickupUser: ClickUpUser) {
    return await prisma.user.upsert({
      where: { email: clickupUser.email },
      update: {
        name: clickupUser.username,
        clickupId: clickupUser.id.toString(),
        avatar: clickupUser.profilePicture || null,
        lastSeen: new Date(),
      },
      create: {
        email: clickupUser.email,
        name: clickupUser.username,
        username: clickupUser.username,
        clickupId: clickupUser.id.toString(),
        avatar: clickupUser.profilePicture || null,
        lastSeen: new Date(),
      },
    });
  }

  private async findOrCreateSystemUser() {
    return await prisma.user.upsert({
      where: { email: 'system@clickup.unassigned' },
      update: { lastSeen: new Date() },
      create: {
        email: 'system@clickup.unassigned',
        name: 'Unassigned Tasks',
        username: 'unassigned',
        isActive: false,
      },
    });
  }

  private mapClickUpStatus(clickupStatus: string): TaskStatus {
    const statusMap: { [key: string]: TaskStatus } = {
      'to do': 'TODO',
      'todo': 'TODO',
      'open': 'TODO',
      'in progress': 'IN_PROGRESS',
      'in review': 'REVIEW',
      'review': 'REVIEW',
      'testing': 'TESTING',
      'qa': 'TESTING',
      'done': 'DONE',
      'complete': 'DONE',
      'completed': 'DONE',
      'closed': 'CLOSED',
      'cancelled': 'CANCELLED',
      'canceled': 'CANCELLED',
    };
    
    return statusMap[clickupStatus.toLowerCase()] || 'TODO';
  }

  private mapClickUpPriority(clickupPriority?: string): TaskPriority | null {
    if (!clickupPriority) return null;
    
    const priorityMap: { [key: string]: TaskPriority } = {
      'urgent': 'URGENT',
      'high': 'HIGH',
      'normal': 'NORMAL',
      'low': 'LOW',
    };
    
    return priorityMap[clickupPriority.toLowerCase()] || null;
  }

  private async updateUserTaskStatistics(userId: string): Promise<void> {
    try {
      const [totalTasks, completedTasks, totalTimeSpent] = await Promise.all([
        prisma.task.count({ where: { assigneeId: userId } }),
        prisma.task.count({ 
          where: { 
            assigneeId: userId, 
            status: { in: ['DONE', 'CLOSED'] } 
          } 
        }),
        prisma.task.aggregate({
          where: { assigneeId: userId },
          _sum: { timeSpent: true },
        }),
      ]);

      await prisma.user.update({
        where: { id: userId },
        data: {
          totalTasksCompleted: completedTasks,
          totalTimeSpent: totalTimeSpent._sum.timeSpent || 0,
        },
      });
    } catch (error) {
      syncLogger.error(`Failed to update user task statistics for ${userId}:`, error);
    }
  }

  private async updateUserTimeStatistics(userId: string): Promise<void> {
    try {
      const totalTimeTracked = await prisma.timeEntry.aggregate({
        where: { userId },
        _sum: { duration: true },
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          totalTimeSpent: totalTimeTracked._sum.duration || 0,
        },
      });
    } catch (error) {
      syncLogger.error(`Failed to update user time statistics for ${userId}:`, error);
    }
  }

  private async updateSystemMetrics(): Promise<void> {
    try {
      const today = startOfDay(new Date());
      
      const [totalTasks, completedTasks, pendingTasks, totalTimeTracked] = await Promise.all([
        prisma.task.count(),
        prisma.task.count({ where: { status: { in: ['DONE', 'CLOSED'] } } }),
        prisma.task.count({ where: { status: { notIn: ['DONE', 'CLOSED'] } } }),
        prisma.timeEntry.aggregate({
          _sum: { duration: true },
        }),
      ]);

      await prisma.systemMetrics.upsert({
        where: { date: today },
        update: {
          totalTasks,
          completedTasks,
          pendingTasks,
          totalTimeTracked: totalTimeTracked._sum.duration || 0,
        },
        create: {
          date: today,
          totalTasks,
          completedTasks,
          pendingTasks,
          totalTimeTracked: totalTimeTracked._sum.duration || 0,
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
const clickupService = new ClickUpService();

export const syncClickUpData = () => clickupService.syncAllData();
export default clickupService;
