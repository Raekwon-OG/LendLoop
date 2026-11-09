"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/types";

interface NavItem {
  label: string;
  href: string;
  badge?: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Browse Tools", href: "/dashboard/tools" },
  { label: "My Listings", href: "/dashboard/listings" },
  { label: "My Requests", href: "/dashboard/requests" },
  { label: "Incoming Requests", href: "/dashboard/incoming" },
  { label: "Admin", href: "/dashboard/admin", adminOnly: true },
];

interface DashboardNavProps {
  role?: UserRole;
}

export function DashboardNav({ role = "user" }: DashboardNavProps) {
  const pathname = usePathname();

  const filteredItems = navItems.filter((item) => {
    if (item.adminOnly && role !== "admin") {
      return false;
    }
    return true;
  });

  return (
    <nav className="flex flex-col space-y-1">
      {filteredItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-emerald-50 font-semibold text-emerald-800"
                : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <span>{item.label}</span>
            {item.adminOnly && (
              <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-stone-700 uppercase">
                Admin
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
