import { Outlet } from 'react-router';
import { Header } from '../components/Header';

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-[1600px] mx-auto px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
