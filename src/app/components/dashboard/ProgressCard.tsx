import { Card } from '../ui/card';

interface ProgressCardProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
  color?: string;
}

export function ProgressCard({ 
  title, 
  current, 
  target, 
  unit = '', 
  color = '#2d6a4f' 
}: ProgressCardProps) {
  const percentage = Math.min((current / target) * 100, 100);
  
  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="text-sm text-gray-500">{title}</h3>
          <span className="text-xs text-gray-400">{percentage.toFixed(0)}%</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-gray-900">
              {current.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500">
              / {target.toLocaleString()} {unit}
            </span>
          </div>
          
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${percentage}%`,
                backgroundColor: color 
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
