import { LucideIcon } from 'lucide-react';
import { Card, CardHeader } from '../ui/card';

interface Action {
  icon: LucideIcon;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  title?: string;
  actions: Action[];
}

export function QuickActions({ title = 'Quick Actions', actions }: QuickActionsProps) {
  return (
    <Card>
      <CardHeader title={title} />
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all"
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: action.bgColor }}
              >
                <Icon className="w-6 h-6" style={{ color: action.color }} />
              </div>
              <div className="text-center">
                <h4 className="text-sm font-medium text-gray-900">{action.label}</h4>
                <p className="text-xs text-gray-500 mt-1">{action.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
