import { DashboardSection } from '../components/ui/DashboardLayout';
import { Grid } from '../components/ui/Grid';
import { Card, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { StatCard } from '../components/ui/StatCard';
import { MetricCard } from '../components/dashboard/MetricCard';
import { ProgressCard } from '../components/dashboard/ProgressCard';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { LeaderboardCard } from '../components/dashboard/LeaderboardCard';
import { QuickActions } from '../components/dashboard/QuickActions';
import { ComparisonCard } from '../components/dashboard/ComparisonCard';
import { FilterBar } from '../components/dashboard/FilterBar';
import { 
  Download, 
  Package, 
  Users, 
  TrendingUp, 
  DollarSign,
  FileText,
  Upload,
  Settings,
  Bell
} from 'lucide-react';

const activities = [
  {
    id: '1',
    title: 'Component library updated',
    description: 'Added 9 new dashboard components',
    timestamp: '10 minutes ago',
    type: 'success' as const,
  },
  {
    id: '2',
    title: 'New design tokens',
    description: 'Updated color palette and spacing',
    timestamp: '1 hour ago',
    type: 'info' as const,
  },
  {
    id: '3',
    title: 'Breaking change',
    description: 'Grid component API updated',
    timestamp: '3 hours ago',
    type: 'warning' as const,
  },
];

const leaderboardData = [
  { rank: 1, name: 'MetricCard', value: 1250, change: 42 },
  { rank: 2, name: 'StatCard', value: 980, change: 28 },
  { rank: 3, name: 'ChartContainer', value: 756, change: -5 },
  { rank: 4, name: 'Table', value: 542, change: 18 },
  { rank: 5, name: 'Button', value: 498, change: 12 },
];

const quickActions = [
  {
    icon: FileText,
    label: 'Documentation',
    description: 'View component docs',
    color: '#2d6a4f',
    bgColor: '#d4edda',
  },
  {
    icon: Upload,
    label: 'Export',
    description: 'Download components',
    color: '#3b82f6',
    bgColor: '#dbeafe',
  },
  {
    icon: Settings,
    label: 'Configure',
    description: 'Customize theme',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
  },
  {
    icon: Bell,
    label: 'Updates',
    description: 'Check for new versions',
    color: '#f59e0b',
    bgColor: '#fef3c7',
  },
];

const comparisonMetrics = [
  { label: 'Bundle Size', before: 245, after: 182, unit: 'KB' },
  { label: 'Load Time', before: 3.2, after: 1.8, unit: 's' },
  { label: 'Components', before: 12, after: 21, unit: 'total' },
];

export function ComponentShowcase() {
  return (
    <>
      {/* Filters */}
      <FilterBar
        searchPlaceholder="Search components..."
        filters={[
          { label: 'All Categories', value: 'all' },
          { label: 'Recently Added', value: 'recent' },
        ]}
        onExport={() => alert('Exporting component library...')}
      />
      
      {/* Buttons */}
      <DashboardSection>
        <Card>
          <CardHeader title="Buttons" subtitle="Primary, secondary, and ghost variants" />
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" icon={<Download className="w-4 h-4" />}>
              Primary Button
            </Button>
            <Button variant="secondary" icon={<Upload className="w-4 h-4" />}>
              Secondary Button
            </Button>
            <Button variant="ghost" icon={<Settings className="w-4 h-4" />}>
              Ghost Button
            </Button>
          </div>
        </Card>
      </DashboardSection>
      
      {/* Stat Cards */}
      <DashboardSection>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Stat Cards</h2>
          <p className="text-sm text-gray-500 mt-1">Simple KPI display with trends</p>
        </div>
        <Grid cols={{ default: 1, md: 2, lg: 4 }} gap={6}>
          <StatCard
            label="Total Components"
            value="21"
            trend={{ value: 75 }}
            description="↑ from last version"
          />
          <StatCard
            label="Downloads"
            value="12.5K"
            trend={{ value: 23 }}
            description="↑ this month"
          />
          <StatCard
            label="GitHub Stars"
            value="1,847"
            trend={{ value: 18 }}
            description="↑ this week"
          />
          <StatCard
            label="Active Users"
            value="847"
            trend={{ value: 31 }}
            description="↑ from yesterday"
          />
        </Grid>
      </DashboardSection>
      
      {/* Metric Cards */}
      <DashboardSection>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Metric Cards</h2>
          <p className="text-sm text-gray-500 mt-1">Enhanced cards with icons and colors</p>
        </div>
        <Grid cols={{ default: 1, md: 2, lg: 4 }} gap={6}>
          <MetricCard
            title="Revenue"
            value="$72,540"
            change={{ value: 12.5, label: 'vs last month' }}
            icon={DollarSign}
            iconColor="#2d6a4f"
            iconBgColor="#d4edda"
          />
          <MetricCard
            title="Users"
            value="12,847"
            change={{ value: 8.2, label: 'vs last month' }}
            icon={Users}
            iconColor="#3b82f6"
            iconBgColor="#dbeafe"
          />
          <MetricCard
            title="Products"
            value="53,241"
            change={{ value: 23.1, label: 'vs last month' }}
            icon={Package}
            iconColor="#8b5cf6"
            iconBgColor="#ede9fe"
          />
          <MetricCard
            title="Growth"
            value="+47%"
            change={{ value: 5.3, label: 'vs last month' }}
            icon={TrendingUp}
            iconColor="#f59e0b"
            iconBgColor="#fef3c7"
          />
        </Grid>
      </DashboardSection>
      
      {/* Progress Cards */}
      <DashboardSection>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Progress Cards</h2>
          <p className="text-sm text-gray-500 mt-1">Track goals with visual progress bars</p>
        </div>
        <Grid cols={{ default: 1, md: 2, lg: 3 }} gap={6}>
          <ProgressCard
            title="Q1 Goal"
            current={7500}
            target={10000}
            unit="units"
            color="#2d6a4f"
          />
          <ProgressCard
            title="Annual Target"
            current={28400}
            target={50000}
            unit="sales"
            color="#3b82f6"
          />
          <ProgressCard
            title="User Adoption"
            current={847}
            target={1000}
            unit="users"
            color="#8b5cf6"
          />
        </Grid>
      </DashboardSection>
      
      {/* Leaderboard, Comparison, and Actions */}
      <DashboardSection>
        <Grid cols={{ default: 1, md: 2, lg: 3 }} gap={6}>
          <LeaderboardCard
            title="Most Used Components"
            items={leaderboardData}
            valueLabel="Uses"
          />
          <ComparisonCard
            title="Performance Improvements"
            subtitle="Before vs After optimization"
            beforeLabel="Before"
            afterLabel="After"
            metrics={comparisonMetrics}
          />
          <QuickActions actions={quickActions} />
        </Grid>
      </DashboardSection>
      
      {/* Activity Feed */}
      <DashboardSection spacing={0}>
        <Grid cols={{ default: 1, lg: 3 }} gap={6}>
          <div className="lg:col-span-2">
            <Card>
              <CardHeader 
                title="Component Library" 
                subtitle="Complete collection of reusable dashboard components"
                action={
                  <Button variant="primary" size="sm" icon={<Download className="w-4 h-4" />}>
                    Download
                  </Button>
                }
              />
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">UI Components</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Button', 'Card', 'Select', 'Table', 'Logo', 'Grid'].map((name) => (
                      <span key={name} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Dashboard Components</h4>
                  <div className="flex flex-wrap gap-2">
                    {['MetricCard', 'ProgressCard', 'ActivityFeed', 'LeaderboardCard', 'QuickActions', 'ComparisonCard', 'FilterBar'].map((name) => (
                      <span key={name} className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-lg">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Chart Components</h4>
                  <div className="flex flex-wrap gap-2">
                    {['LineChart', 'BarChart', 'PieChart', 'AreaChart', 'MapVisualization'].map((name) => (
                      <span key={name} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
          <ActivityFeed activities={activities} title="Recent Changes" />
        </Grid>
      </DashboardSection>
    </>
  );
}
