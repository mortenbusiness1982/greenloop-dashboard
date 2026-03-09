import { useEffect, useState } from 'react';
import { DashboardSection } from '../components/ui/DashboardLayout';
import { Grid } from '../components/ui/Grid';
import { MetricCard } from '../components/dashboard/MetricCard';
import { FilterBar } from '../components/dashboard/FilterBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Package, Users, TrendingUp, DollarSign } from 'lucide-react';
import { fetchTraceability } from '../../services/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

type TraceabilityData = {
  validatedScans?: number;
  totalScans?: number;
  uniqueConsumers?: number;
  ecoPointsIssued?: number;
  redeemedPoints?: number;
  avgUnitsPerConsumer?: number;
  redemptions?: number;
  redemptionRate?: number;
  perProduct?: { product_name: string; units_recycled: number }[];
  dailyTrend?: { date: string; units: number }[];
  geoBreakdown?: { city: string; units: number }[];
};

export function OverviewDashboard() {
  const [traceability, setTraceability] = useState<TraceabilityData | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('greenloop_token');

    console.log('[OverviewDashboard] fetchTraceability() starting', {
      hasToken: Boolean(token),
    });

    if (!token) {
      console.warn('[OverviewDashboard] No auth token found in localStorage (token/greenloop_token)');
      return;
    }

    let active = true;

    fetchTraceability(token)
      .then((data) => {
        console.log('[OverviewDashboard] traceability response', data);
        if (!active) return;
        setTraceability(data?.totals ? data.totals : data);
      })
      .catch((err) => {
        console.error('[OverviewDashboard] fetchTraceability failed', err);
      });

    return () => {
      active = false;
    };
  }, []);

  const verifiedUnits = traceability?.validatedScans ?? 0;
  const recyclingEvents = traceability?.totalScans ?? 0;
  const consumers = traceability?.uniqueConsumers ?? 0;
  const avgUnits = traceability?.avgUnitsPerConsumer ?? 0;
  const ecoPointsIssued = traceability?.ecoPointsIssued ?? 0;
  const redeemedPoints = traceability?.redeemedPoints ?? 0;
  const redemptions = traceability?.redemptions ?? 0;
  const redemptionRate = traceability?.redemptionRate ?? 0;
  const topProducts = [...(traceability?.perProduct ?? [])]
    .sort((a, b) => b.units_recycled - a.units_recycled)
    .slice(0, 10);
  const activityData =
    (traceability?.dailyTrend ?? []).map(d => ({
      date: new Date(d.date).toISOString().split("T")[0],
      units: d.units
    }));
  const cities = traceability?.geoBreakdown ?? [];

  return (
    <>
      <FilterBar
        searchPlaceholder="Search dashboard..."
        filters={[
          { label: 'All Brands', value: 'all' },
          { label: 'Last 30 Days', value: '30d' },
        ]}
        onExport={() => console.log('Export clicked')}
      />
      
      <DashboardSection>
        <Grid cols={{ default: 1, md: 2, lg: 4, xl: 8 }} gap={6}>
          <MetricCard
            title="Verified Units Recycled"
            value={verifiedUnits.toLocaleString()}
            change={{ value: 12.5, label: 'vs last month' }}
            icon={DollarSign}
            iconColor="#2d6a4f"
            iconBgColor="#d4edda"
          />
          <MetricCard
            title="Engaged Consumers"
            value={consumers.toLocaleString()}
            change={{ value: 8.2, label: 'vs last month' }}
            icon={Users}
            iconColor="#3b82f6"
            iconBgColor="#dbeafe"
          />
          <MetricCard
            title="Recycling Events"
            value={recyclingEvents.toLocaleString()}
            change={{ value: 23.1, label: 'vs last month' }}
            icon={Package}
            iconColor="#8b5cf6"
            iconBgColor="#ede9fe"
          />
          <MetricCard
            title="Avg Units per Consumer"
            value={avgUnits.toLocaleString()}
            change={{ value: 5.3, label: 'vs last month' }}
            icon={TrendingUp}
            iconColor="#f59e0b"
            iconBgColor="#fef3c7"
          />
          <MetricCard
            title="EcoPoints Issued"
            value={ecoPointsIssued.toLocaleString()}
            change={{ value: 0, label: 'current total' }}
            icon={DollarSign}
            iconColor="#2d6a4f"
            iconBgColor="#d4edda"
          />
          <MetricCard
            title="Points Redeemed"
            value={redeemedPoints.toLocaleString()}
            change={{ value: 0, label: 'current total' }}
            icon={DollarSign}
            iconColor="#2d6a4f"
            iconBgColor="#d4edda"
          />
          <MetricCard
            title="Redemptions"
            value={redemptions.toLocaleString()}
            change={{ value: 0, label: 'current total' }}
            icon={Package}
            iconColor="#8b5cf6"
            iconBgColor="#ede9fe"
          />
          <MetricCard
            title="Redemption Rate"
            value={`${(redemptionRate * 100).toFixed(1)}%`}
            change={{ value: 0, label: 'current rate' }}
            icon={TrendingUp}
            iconColor="#f59e0b"
            iconBgColor="#fef3c7"
          />
        </Grid>
      </DashboardSection>

      <DashboardSection>
        <Grid cols={{ default: 1, lg: 3 }} gap={6}>
          <Card>
            <CardHeader>
              <CardTitle>Top Recycled Products</CardTitle>
              <CardDescription>Top 10 products by units recycled</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topProducts.length > 0 ? (
                topProducts.map((product) => (
                  <div
                    key={product.product_name}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-foreground">{product.product_name}</span>
                    <span className="text-sm text-muted-foreground">
                      {product.units_recycled.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No product data available.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recycling Activity</CardTitle>
              <CardDescription>Daily recycled units</CardDescription>
            </CardHeader>
            <CardContent style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="units"
                    stroke="#2d6a4f"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recycling by City</CardTitle>
              <CardDescription>Units recycled across locations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cities.length > 0 ? (
                cities.map((city) => (
                  <div
                    key={city.city}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-foreground">{city.city}</span>
                    <span className="text-sm text-muted-foreground">{city.units.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No city data available.</p>
              )}
            </CardContent>
          </Card>
        </Grid>
      </DashboardSection>
    </>
  );
}
