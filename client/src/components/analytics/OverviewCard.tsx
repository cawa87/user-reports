import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface OverviewCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  subtitle?: string;
  formatValue?: (value: number) => string;
}

const OverviewCard: React.FC<OverviewCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  bgColor,
  subtitle,
  formatValue,
}) => {
  const getChangeIcon = () => {
    if (change > 0) return TrendingUp;
    if (change < 0) return TrendingDown;
    return Minus;
  };

  const getChangeColor = () => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const ChangeIcon = getChangeIcon();
  
  const displayValue = typeof value === 'number' && formatValue 
    ? formatValue(value)
    : value.toLocaleString();

  return (
    <div className={`stat-card ${bgColor} border-0`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColor.replace(/\/20$/, '/40')}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div className={`text-2xl font-bold ${color}`}>
          {displayValue}
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {subtitle || 'vs previous period'}
          </p>
          
          <div className={`flex items-center space-x-1 ${getChangeColor()}`}>
            <ChangeIcon className="h-3 w-3" />
            <span className="text-xs font-medium">
              {Math.abs(change).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewCard;

