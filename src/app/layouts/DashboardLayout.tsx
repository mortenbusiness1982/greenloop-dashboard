import { Header } from '../components/Header';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-[1600px] mx-auto px-8 py-8">
        {children}
      </main>
    </div>
  );
}
