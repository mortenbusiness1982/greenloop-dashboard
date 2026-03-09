import { DashboardSection } from '../components/ui/DashboardLayout';
import { Grid } from '../components/ui/Grid';
import { LeaderboardCard } from '../components/dashboard/LeaderboardCard';
import { ComparisonCard } from '../components/dashboard/ComparisonCard';
import { QuickActions } from '../components/dashboard/QuickActions';
import { RecyclingChart } from '../components/RecyclingChart';
import { ProductChart } from '../components/ProductChart';
import { FileText, Upload, Settings, Bell } from 'lucide-react';

const leaderboardData = [
  { rank: 1, name: 'New York', value: 18432, change: 12 },
  { rank: 2, name: 'Los Angeles', value: 15876, change: 8 },
  { rank: 3, name: 'Chicago', value: 12654, change: -3 },
  { rank: 4, name: 'Houston', value: 9821, change: 15 },
  { rank: 5, name: 'Phoenix', value: 8234, change: 5 },
];

const comparisonMetrics = [
  { label: 'Purchase Frequency', before: 2.1, after: 4.2, unit: 'per month' },
  { label: 'Brand Loyalty Score', before: 42, after: 87, unit: 'points' },
  { label: 'Avg Order Value', before: 89, after: 156, unit: '$' },
];

const quickActions = [
  {
    icon: FileText,
    label: 'Generate Report',
    description: 'Export analytics',
    color: '#2d6a4f',
    bgColor: '#d4edda',
  },
  {
    icon: Upload,
    label: 'Import Data',
    description: 'Upload CSV file',
    color: '#3b82f6',
    bgColor: '#dbeafe',
  },
  {
    icon: Settings,
    label: 'Settings',
    description: 'Configure dashboard',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
  },
  {
    icon: Bell,
    label: 'Notifications',
    description: 'Manage alerts',
    color: '#f59e0b',
    bgColor: '#fef3c7',
  },
];

export function AnalyticsDashboard() {
  return (
    <>
      <DashboardSection>
        <Grid cols={{ default: 1, lg: 2 }} gap={6}>
          <RecyclingChart />
          <ProductChart />
        </Grid>
      </DashboardSection>
      
      <DashboardSection spacing={0}>
        <Grid cols={{ default: 1, md: 2, lg: 3 }} gap={6}>
          <LeaderboardCard
            title="Top Cities by Recycling"
            items={leaderboardData}
            valueLabel="Units"
          />
          <ComparisonCard
            title="Impact Analysis"
            subtitle="Recyclers vs Non-recyclers"
            beforeLabel="Non-recyclers"
            afterLabel="Recyclers"
            metrics={comparisonMetrics}
          />
          <QuickActions actions={quickActions} />
        </Grid>
      </DashboardSection>
    </>
  );
}