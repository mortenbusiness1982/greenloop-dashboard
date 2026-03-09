import { Card, CardHeader } from '../ui/card';
import { Circle } from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'success' | 'info' | 'warning';
}

interface ActivityFeedProps {
  activities: Activity[];
  title?: string;
}

const typeColors = {
  success: 'bg-green-500',
  info: 'bg-blue-500',
  warning: 'bg-yellow-500',
};

export function ActivityFeed({ activities, title = 'Recent Activity' }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader title={title} />
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={activity.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-2 h-2 rounded-full ${typeColors[activity.type]}`} />
              {index !== activities.length - 1 && (
                <div className="w-px h-full bg-gray-200 mt-1" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
              <p className="text-xs text-gray-500 mt-1">{activity.description}</p>
              <span className="text-xs text-gray-400 mt-1 block">{activity.timestamp}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
