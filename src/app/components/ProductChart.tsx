import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ui/ChartContainer';

const data = [
  { product: 'Air Max 90', units: 15420 },
  { product: 'Dri-FIT Tee', units: 12340 },
  { product: 'Sportswear Jacket', units: 9876 },
  { product: 'Running Shorts', units: 8654 },
  { product: 'Tech Fleece', units: 7321 },
];

export function ProductChart() {
  return (
    <ChartContainer title="Recycling by Product">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="product" 
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
          <Bar dataKey="units" fill="#2d6a4f" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
