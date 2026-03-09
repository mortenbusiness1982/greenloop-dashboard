import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    direction?: 'up' | 'down';
  };
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, description, trend, icon, className = '' }: StatCardProps) {
  const trendDirection = trend?.direction || (trend && trend.value >= 0 ? 'up' : 'down');
  const isPositive = trendDirection === 'up';
  
  return (
    <div className={`bg-white rounded-2xl p-6 border border-gray-200 ${className}`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm text-gray-500">{label}</h3>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-semibold text-gray-900 mb-1">{value}</div>
          {description && <div className="text-xs text-gray-400">{description}</div>}
        </div>
        
        {trend && (
          <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
