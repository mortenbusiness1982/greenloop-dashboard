import { ReactNode } from 'react';

interface DashboardLayoutProps {
  header: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}

export function DashboardLayout({ 
  header, 
  children, 
  maxWidth = '1600px' 
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {header}
      <main className="mx-auto px-8 py-8" style={{ maxWidth }}>
        {children}
      </main>
    </div>
  );
}

interface DashboardSectionProps {
  children: ReactNode;
  spacing?: number;
}

export function DashboardSection({ children, spacing = 8 }: DashboardSectionProps) {
  return <div className={`mb-${spacing}`}>{children}</div>;
}
