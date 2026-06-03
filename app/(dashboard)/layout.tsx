import { ReactNode } from "react";
import { DashboardLanguageProvider } from "@/components/crm/DashboardLanguage";
import { CrmShell } from "@/components/crm/CrmShell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLanguageProvider>
      <CrmShell>{children}</CrmShell>
    </DashboardLanguageProvider>
  );
}
