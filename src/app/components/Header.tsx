'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Select } from './ui/select';
import { Logo } from './ui/Logo';
import { useAuth } from '../context/AuthContext';
import { fetchTraceability } from '../../services/api';
import { API_BASE } from '../../config/api';

export function Header() {
  const { logout } = useAuth();
  const pathname = usePathname();

  async function handleExportCSV() {
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("greenloop_token");

      if (!token) {
        console.warn("No auth token found");
        return;
      }

      const report = await fetchTraceability(token);
      let events = [];

      try {
        const res = await fetch(`${API_BASE}/brand/reports/events`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          events = await res.json();
        } else {
          console.warn("Events export unavailable:", res.status);
        }
      } catch (err) {
        console.warn("Events export failed:", err);
      }

      const rows = [
        ["GreenLoop Traceability Report"],
        [],
        ["Metric","Value"],
        ["Verified Units Recycled", report.validatedScans],
        ["Recycling Events", report.totalScans],
        ["Engaged Consumers", report.uniqueConsumers],
        ["Avg Units per Consumer", report.avgUnitsPerConsumer],
        ["EcoPoints Issued", report.ecoPointsIssued],
        ["Points Redeemed", report.redeemedPoints],
        ["Redemptions", report.redemptions],
        ["Redemption Rate", report.redemptionRate],
        [],
        ["Top Recycled Products"],
        ["Product","Units Recycled"],
        ...(report.perProduct ?? []).map((p: any) => [p.product_name, p.units_recycled]),
        [],
        ["Recycling by City"],
        ["City","Units Recycled"],
        ...(report.geoBreakdown ?? []).map((c: any) => [c.city, c.units]),
        [],
        ["Recycling Activity"],
        ["Date","Units"],
        ...(report.dailyTrend ?? []).map((d: any) => [
          new Date(d.date).toISOString().split("T")[0],
          d.units
        ])
      ];

      rows.push([]);
      rows.push(["Recycling Events"]);
      rows.push([
        "recycled_at",
        "product_name",
        "barcode",
        "units",
        "points",
        "city",
        "lat",
        "lng",
        "scan_status",
        "anonymized_user_id",
        "recycling_event_id",
        "recycling_event_item_id",
        "scan_id"
      ]);

      (events ?? []).forEach((e: any) => {
        rows.push([
          new Date(e.recycled_at).toISOString(),
          e.product_name,
          e.barcode,
          e.units,
          e.points,
          e.city,
          e.lat,
          e.lng,
          e.scan_status,
          e.anonymized_user_id,
          e.recycling_event_id,
          e.recycling_event_item_id,
          e.scan_id
        ]);
      });

      const csv = rows.map((r: any[]) => r.join(",")).join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().slice(0,10);
      a.download = `greenloop-traceability-${today}.csv`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export CSV failed", error);
    }
  }
  
  return (
    <div>
      {/* Main Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <Logo text="GreenLoop" initials="GL" color="#2d6a4f" />
          
          <div className="flex items-center gap-4">
            <Select value="Nike Sportswear" />
            <Select value="Last 30 days" icon={<Calendar className="w-4 h-4 text-gray-500" />} />
            <Button
              variant="primary"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
            <Button variant="secondary" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-8">
        <div className="flex gap-1">
          <Link
            href="/"
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              pathname === '/'
                ? 'text-[#2d6a4f] border-[#2d6a4f]'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
