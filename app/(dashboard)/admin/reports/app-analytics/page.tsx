import { AdminAppAnalyticsWorkspace } from "@/components/admin/AdminAppAnalyticsWorkspace";
import { AdminAppAnalyticsReports } from "@/components/admin/AdminAppAnalyticsReports";

export default async function AdminAppAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return view === "live" ? (
    <AdminAppAnalyticsWorkspace />
  ) : (
    <AdminAppAnalyticsReports />
  );
}
