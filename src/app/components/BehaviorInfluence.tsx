import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ui/ChartContainer';

const data = [
  { metric: 'Purchase Frequency', redeemers: 4.2, nonRedeemers: 2.1 },
  { metric: 'Brand Loyalty', redeemers: 87, nonRedeemers: 42 },
  { metric: 'Avg Order Value', redeemers: 156, nonRedeemers: 89 },
  { metric: 'Referral Rate', redeemers: 34, nonRedeemers: 12 },
];

export function BehaviorInfluence() {
  return (
    <ChartContainer 
      title="Behavior Influence" 
      subtitle="Comparing recyclers vs non-recyclers"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="metric" 
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
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar dataKey="redeemers" name="Redeemers" fill="#2d6a4f" radius={[8, 8, 0, 0]} />
          <Bar dataKey="nonRedeemers" name="Non-redeemers" fill="#d1d5db" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
