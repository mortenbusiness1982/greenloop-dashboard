import Link from "next/link";
import { ReactNode } from "react";

const navItems = [
  { href: "/brand", label: "Brand" },
  { href: "/partner", label: "Partner" },
  { href: "/admin", label: "Admin" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-8 py-4">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Dashboard
          </span>
          <nav className="flex gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
