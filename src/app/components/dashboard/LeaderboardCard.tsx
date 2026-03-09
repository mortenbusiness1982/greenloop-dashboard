import { Card, CardHeader } from '../ui/Card';
import { Trophy, TrendingUp } from 'lucide-react';

interface LeaderboardItem {
  rank: number;
  name: string;
  value: number;
  change?: number;
  avatar?: string;
}

interface LeaderboardCardProps {
  title: string;
  items: LeaderboardItem[];
  valueLabel?: string;
}

export function LeaderboardCard({ title, items, valueLabel = 'Points' }: LeaderboardCardProps) {
  return (
    <Card>
      <CardHeader title={title} />
      <div className="space-y-3">
        {items.map((item) => (
          <div 
            key={item.rank} 
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-center w-8 h-8">
              {item.rank === 1 && <Trophy className="w-5 h-5 text-yellow-500" />}
              {item.rank === 2 && <Trophy className="w-5 h-5 text-gray-400" />}
              {item.rank === 3 && <Trophy className="w-5 h-5 text-orange-600" />}
              {item.rank > 3 && (
                <span className="text-sm font-medium text-gray-400">#{item.rank}</span>
              )}
            </div>
            
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
              <p className="text-xs text-gray-500">
                {item.value.toLocaleString()} {valueLabel.toLowerCase()}
              </p>
            </div>
            
            {item.change !== undefined && item.change !== 0 && (
              <div className={`flex items-center gap-1 ${item.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="w-3 h-3" />
                <span className="text-xs font-medium">
                  {item.change > 0 ? '+' : ''}{item.change}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
