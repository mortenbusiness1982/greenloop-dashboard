import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ui/ChartContainer';

const data = [
  { month: 'Jan', units: 12400 },
  { month: 'Feb', units: 18600 },
  { month: 'Mar', units: 23200 },
  { month: 'Apr', units: 29800 },
  { month: 'May', units: 35400 },
  { month: 'Jun', units: 42100 },
  { month: 'Jul', units: 48600 },
  { month: 'Aug', units: 53200 },
];

export function RecyclingChart() {
  return (
    <ChartContainer title="Recycling Over Time">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="month" 
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '8px 12px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="units" 
            stroke="#2d6a4f" 
            strokeWidth={3}
            dot={{ fill: '#2d6a4f', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
