import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { User, GitCommit, CheckSquare, Clock } from 'lucide-react';

interface ProductivityComparisonProps {
  comparisons: Array<{
    user: {
      id: string;
      name: string;
      username: string;
      avatar?: string;
    } | null;
    metrics: {
      commits: number;
      tasksCompleted: number;
      timeSpent: number;
      productivityScore: number;
    };
  }>;
  isLoading?: boolean;
}

const ProductivityComparison: React.FC<ProductivityComparisonProps> = ({
  comparisons,
  isLoading,
}) => {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="skeleton h-6 w-48 mb-4"></div>
          <div className="skeleton h-64 w-full"></div>
        </div>
      </div>
    );
  }

  if (comparisons.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Users Selected
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Select users to compare their productivity metrics.
          </p>
        </div>
      </div>
    );
  }

  // Prepare data for the bar chart
  const chartData = comparisons.map((comparison, index) => ({
    name: comparison.user?.name || 'Unknown User',
    username: comparison.user?.username || 'unknown',
    commits: comparison.metrics.commits,
    tasks: comparison.metrics.tasksCompleted,
    score: comparison.metrics.productivityScore,
    timeSpent: comparison.metrics.timeSpent,
    color: `hsl(${(index * 60) % 360}, 70%, 50%)`,
  }));

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            {data.name} (@{data.username})
          </p>
          <div className="space-y-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Commits: {data.commits}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Tasks: {data.tasks}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Score: {data.score}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Time: {formatTime(data.timeSpent)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Productivity Score Chart */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Productivity Score Comparison
          </h3>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis 
                  dataKey="username"
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                />
                <YAxis className="text-xs fill-gray-600 dark:fill-gray-400" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {comparisons.map((comparison, index) => {
          if (!comparison.user) return null;
          
          return (
            <div key={comparison.user.id} className="card">
              <div className="card-body">
                {/* User Header */}
                <div className="flex items-center space-x-3 mb-4">
                  {comparison.user.avatar ? (
                    <img
                      src={comparison.user.avatar}
                      alt={comparison.user.name}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {comparison.user.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      @{comparison.user.username}
                    </p>
                  </div>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  ></div>
                </div>

                {/* Metrics */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <GitCommit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Commits</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {comparison.metrics.commits}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Tasks</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {comparison.metrics.tasksCompleted}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Time</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatTime(comparison.metrics.timeSpent)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Productivity Score
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                          {comparison.metrics.productivityScore}
                        </div>
                        <div className="w-12 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary-600 dark:bg-primary-400 rounded-full"
                            style={{ width: `${Math.min(comparison.metrics.productivityScore, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductivityComparison;

