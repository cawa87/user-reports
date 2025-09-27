import React from 'react';
import { Plus, Minus, Code, FileText, TrendingUp } from 'lucide-react';

interface CodeStatsCardProps {
  stats: {
    linesAdded: number;
    linesDeleted: number;
    filesChanged: number;
    netLines?: number;
    commitsCount: number;
    avgLinesPerCommit?: number;
  };
  period?: string;
  className?: string;
}

const CodeStatsCard: React.FC<CodeStatsCardProps> = ({ 
  stats, 
  period = 'this period',
  className = '' 
}) => {
  const netLines = stats.netLines ?? (stats.linesAdded - stats.linesDeleted);
  const avgLinesPerCommit = stats.avgLinesPerCommit ?? (stats.commitsCount > 0 ? netLines / stats.commitsCount : 0);
  
  return (
    <div className={`card ${className}`}>
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-title flex items-center">
            <Code className="h-5 w-5 mr-2" />
            Code Impact
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {period}
          </span>
        </div>

        {/* Main Code Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center justify-center space-x-1 text-green-600 dark:text-green-400 mb-1">
              <Plus className="h-4 w-4" />
              <span className="text-lg font-semibold">
                {stats.linesAdded.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Lines Added
            </div>
          </div>

          <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center justify-center space-x-1 text-red-600 dark:text-red-400 mb-1">
              <Minus className="h-4 w-4" />
              <span className="text-lg font-semibold">
                {stats.linesDeleted.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Lines Removed
            </div>
          </div>
        </div>

        {/* Net Change & Files */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center justify-center space-x-1 text-blue-600 dark:text-blue-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className={`text-lg font-semibold ${netLines >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {netLines >= 0 ? '+' : ''}{netLines.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Net Change
            </div>
          </div>

          <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
            <div className="flex items-center justify-center space-x-1 text-purple-600 dark:text-purple-400 mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-lg font-semibold">
                {stats.filesChanged.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Files Changed
            </div>
          </div>
        </div>

        {/* Averages */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Avg. lines per commit:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.round(avgLinesPerCommit)}
            </span>
          </div>
          
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-gray-600 dark:text-gray-400">
              Code efficiency:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {stats.linesDeleted > 0 ? ((stats.linesAdded / (stats.linesAdded + stats.linesDeleted)) * 100).toFixed(1) : '100.0'}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeStatsCard;
