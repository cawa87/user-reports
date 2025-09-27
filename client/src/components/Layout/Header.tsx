import React from 'react';
import { Menu, Bell, Search, Sun, Moon, RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { useTheme } from '@/hooks/useTheme';
import { syncApi } from '@/services/api';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  // Get sync status
  const { data: syncStatus } = useQuery(
    'sync-status',
    () => syncApi.getStatus({ limit: 1 }),
    {
      refetchInterval: 30000, // Check every 30 seconds
    }
  );

  const handleManualSync = async () => {
    try {
      toast.loading('Starting data synchronization...', { id: 'sync' });
      await syncApi.manual();
      toast.success('Data synchronization started successfully', { id: 'sync' });
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries();
    } catch (error) {
      toast.error('Failed to start synchronization', { id: 'sync' });
    }
  };

  const lastSync = syncStatus?.data?.lastSuccessfulSync;
  const isRunning = syncStatus?.data?.status?.isRunning;

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-6">
      {/* Left section */}
      <div className="flex items-center space-x-4">
        {/* Mobile menu button */}
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden focus-ring"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search bar */}
        <div className="hidden sm:block relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users, projects..."
            className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-4">
        {/* Sync status */}
        <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          {lastSync && (
            <span>
              Last sync: {format(new Date(lastSync), 'MMM d, h:mm a')}
            </span>
          )}
          <button
            onClick={handleManualSync}
            disabled={isRunning}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring disabled:opacity-50"
            title="Manual sync"
          >
            <RefreshCw 
              className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} 
            />
          </button>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring relative">
          <Bell className="h-5 w-5" />
          {/* Notification badge */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User menu */}
        <div className="relative">
          <button className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring">
            <img
              className="h-8 w-8 rounded-full bg-primary-500"
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              alt="User avatar"
            />
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Admin User
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Administrator
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
