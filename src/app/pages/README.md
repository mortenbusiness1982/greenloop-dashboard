# Dashboard Pages

This directory contains example dashboard pages demonstrating how to use the reusable component library.

## Pages

### OverviewDashboard
A comprehensive dashboard overview with metrics, charts, and activity feeds.
- **Components used**: MetricCard, ProgressCard, ActivityFeed, PieChartCard, AreaChartCard, FilterBar
- **Use case**: Executive overview, high-level KPI monitoring

### AnalyticsDashboard
Analytics-focused dashboard with detailed comparisons and leaderboards.
- **Components used**: LeaderboardCard, ComparisonCard, QuickActions, RecyclingChart, ProductChart
- **Use case**: Detailed analytics, competitive analysis

### DataDashboard
Data-centric dashboard focused on traceability and detailed records.
- **Components used**: StatCard, TraceabilityData, MapVisualization, BehaviorInfluence, FilterBar
- **Use case**: Operational data monitoring, audit trails

### ComponentShowcase
A showcase of all available dashboard components with examples.
- **Components used**: All components from the library
- **Use case**: Component documentation, design system reference

## Component Library Structure

```
/components
  /ui                    # Base UI components
    - Button
    - Card
    - Select
    - Table
    - Logo
    - Grid
    - StatCard
    - ChartContainer
    - DashboardLayout
    
  /dashboard            # Specialized dashboard components
    - MetricCard
    - ProgressCard
    - ActivityFeed
    - PieChartCard
    - AreaChartCard
    - LeaderboardCard
    - FilterBar
    - QuickActions
    - ComparisonCard
```

## Usage Example

```tsx
import { DashboardLayout, DashboardSection } from '../components/ui/DashboardLayout';
import { Grid } from '../components/ui/Grid';
import { MetricCard } from '../components/dashboard/MetricCard';

export function MyDashboard() {
  return (
    <DashboardLayout header={<Header />}>
      <DashboardSection>
        <Grid cols={{ default: 1, md: 2, lg: 4 }} gap={6}>
          <MetricCard
            title="Revenue"
            value="$72,540"
            change={{ value: 12.5, label: 'vs last month' }}
            icon={DollarSign}
          />
        </Grid>
      </DashboardSection>
    </DashboardLayout>
  );
}
```
