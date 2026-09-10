import { notFound } from "next/navigation";
import { FixtureSession } from "./FixtureSession";
import { DashboardLanguageProvider } from "@/components/crm/DashboardLanguage";
export default function Preview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <DashboardLanguageProvider>
      <main className="min-h-screen bg-slate-50 p-4 md:p-8">
        <p className="mx-auto mb-4 max-w-7xl text-xs text-amber-800">
          Local verification · Recorded Studio results · No live publication
        </p>
        <FixtureSession />
      </main>
    </DashboardLanguageProvider>
  );
}
