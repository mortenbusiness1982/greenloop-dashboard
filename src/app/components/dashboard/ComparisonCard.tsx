import { Card } from '../ui/card';
import { ArrowRight } from 'lucide-react';

interface Metric {
  label: string;
  before: number;
  after: number;
  unit?: string;
}

interface ComparisonCardProps {
  title: string;
  subtitle?: string;
  beforeLabel: string;
  afterLabel: string;
  metrics: Metric[];
}

export function ComparisonCard({ 
  title, 
  subtitle, 
  beforeLabel, 
  afterLabel, 
  metrics 
}: ComparisonCardProps) {
  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      
      <div className="space-y-4">
        {metrics.map((metric, index) => {
          const change = ((metric.after - metric.before) / metric.before) * 100;
          const isPositive = change >= 0;
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{metric.label}</span>
                <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? '+' : ''}{change.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{beforeLabel}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {metric.before.toLocaleString()}
                    {metric.unit && <span className="text-sm text-gray-500 ml-1">{metric.unit}</span>}
                  </p>
                </div>
                
                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                
                <div className="flex-1 bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-600 mb-1">{afterLabel}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {metric.after.toLocaleString()}
                    {metric.unit && <span className="text-sm text-gray-500 ml-1">{metric.unit}</span>}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
