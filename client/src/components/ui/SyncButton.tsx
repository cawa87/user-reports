import React, { useState } from 'react';
import { RefreshCw, GitlabIcon as GitLab, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { syncApi } from '@/services/api';

interface SyncButtonProps {
  variant?: 'full' | 'gitlab' | 'clickup';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onSyncComplete?: (success: boolean) => void;
  className?: string;
}

const SyncButton: React.FC<SyncButtonProps> = ({
  variant = 'full',
  size = 'md',
  showLabel = true,
  onSyncComplete,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<{ success: boolean; timestamp: Date } | null>(null);

  const getSyncConfig = () => {
    switch (variant) {
      case 'gitlab':
        return {
          icon: GitLab,
          label: 'Sync GitLab',
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-100 dark:bg-orange-900/20 hover:bg-orange-200 dark:hover:bg-orange-900/40',
          action: syncApi.gitlab,
        };
      case 'clickup':
        return {
          icon: Zap,
          label: 'Sync ClickUp',
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-100 dark:bg-purple-900/20 hover:bg-purple-200 dark:hover:bg-purple-900/40',
          action: syncApi.clickup,
        };
      default:
        return {
          icon: RefreshCw,
          label: 'Sync All Data',
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/40',
          action: syncApi.manual,
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  const config = getSyncConfig();
  const IconComponent = config.icon;

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const response = await config.action();
      const success = response.data?.success || false;
      
      setLastSync({
        success,
        timestamp: new Date(),
      });
      
      onSyncComplete?.(success);
      
      // Auto-clear status after 5 seconds
      setTimeout(() => setLastSync(null), 5000);
    } catch (error) {
      console.error('Sync failed:', error);
      setLastSync({
        success: false,
        timestamp: new Date(),
      });
      onSyncComplete?.(false);
      
      // Auto-clear status after 5 seconds
      setTimeout(() => setLastSync(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!lastSync) return null;
    
    return lastSync.success ? (
      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
    );
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleSync}
        disabled={isLoading}
        className={`
          inline-flex items-center space-x-2 ${getSizeClasses()}
          ${config.bgColor} ${config.color}
          border border-transparent rounded-lg
          font-medium transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transform hover:scale-105 active:scale-95
        `}
        title={`${config.label} - Fetch latest data from ${variant === 'full' ? 'GitLab and ClickUp' : variant}`}
      >
        <IconComponent 
          className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} 
        />
        {showLabel && (
          <span>
            {isLoading ? 'Syncing...' : config.label}
          </span>
        )}
      </button>

      {/* Status Indicator */}
      {lastSync && (
        <div className="absolute -top-1 -right-1">
          {getStatusIcon()}
        </div>
      )}

      {/* Tooltip for last sync */}
      {lastSync && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded whitespace-nowrap z-10">
          {lastSync.success ? 'Sync successful' : 'Sync failed'} at {lastSync.timestamp.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default SyncButton;
