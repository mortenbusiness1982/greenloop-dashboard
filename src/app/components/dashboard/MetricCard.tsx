import { LucideIcon } from 'lucide-react';
import { Card } from '../ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
  };
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  iconColor = '#2d6a4f',
  iconBgColor = '#d4edda'
}: MetricCardProps) {
  const isPositive = change && change.value >= 0;
  
  return (
    <Card
      className="
metric-card
relative
bg-white
rounded-xl
border border-gray-200
p-6
shadow-sm
hover:shadow-md
transition-all
duration-200
"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-[#2d6a4f] rounded-t-xl"></div>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{value}</p>
          {change && (
            <div className="flex items-center gap-1">
              <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{change.value}%
              </span>
              <span className="text-xs text-gray-500">{change.label}</span>
            </div>
          )}
        </div>
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: iconBgColor }}
        >
          <Icon className="w-6 h-6" style={{ color: iconColor }} />
        </div>
      </div>
    </Card>
  );
}
