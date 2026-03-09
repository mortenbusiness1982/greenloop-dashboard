import { DashboardSection } from '../components/ui/DashboardLayout';
import { Grid } from '../components/ui/Grid';
import { StatCard } from '../components/ui/StatCard';
import { TraceabilityData } from '../components/TraceabilityData';
import { MapVisualization } from '../components/MapVisualization';
import { BehaviorInfluence } from '../components/BehaviorInfluence';
import { FilterBar } from '../components/dashboard/FilterBar';

export function DataDashboard() {
  return (
    <>
      <FilterBar
        searchPlaceholder="Search traceability data..."
        filters={[
          { label: 'All Products', value: 'all' },
          { label: 'All Locations', value: 'all' },
          { label: 'Today', value: 'today' },
        ]}
        onExport={() => console.log('Export data')}
      />
      
      <DashboardSection>
        <Grid cols={{ default: 1, md: 2, lg: 4 }} gap={6}>
          <StatCard
            label="Total Events"
            value="2,847"
            trend={{ value: 18 }}
            description="↑ from yesterday"
          />
          <StatCard
            label="Verified Scans"
            value="2,791"
            trend={{ value: 15 }}
            description="98% accuracy"
          />
          <StatCard
            label="Active Locations"
            value="127"
            trend={{ value: 8 }}
            description="↑ new locations"
          />
          <StatCard
            label="Data Quality"
            value="99.2%"
            trend={{ value: 2 }}
            description="↑ from last week"
          />
        </Grid>
      </DashboardSection>
      
      <DashboardSection>
        <MapVisualization />
      </DashboardSection>
      
      <DashboardSection>
        <BehaviorInfluence />
      </DashboardSection>
      
      <DashboardSection spacing={0}>
        <TraceabilityData />
      </DashboardSection>
    </>
  );
}