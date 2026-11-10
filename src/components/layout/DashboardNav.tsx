"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
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
  { label: "Admin Panel", href: "/dashboard/admin", adminOnly: true },
];

interface DashboardNavProps {
  role?: UserRole;
}

export function DashboardNav({ role = "user" }: DashboardNavProps) {
  const pathname = usePathname();
  const convexUser = useQuery(api.users.getCurrentUser);

  // Resolve effective role from Convex database record or server-side Clerk claims
  const effectiveRole: UserRole =
    convexUser?.role === "admin" || role === "admin" ? "admin" : "user";

  const filteredItems = navItems.filter((item) => {
    if (item.adminOnly && effectiveRole !== "admin") {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
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
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-800 uppercase">
                  Admin
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Account Status Badges from Convex */}
      {convexUser && (
        <div className="border-t border-stone-100 pt-3 px-3 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                effectiveRole === "admin"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-stone-100 text-stone-700"
              }`}
            >
              {effectiveRole === "admin" ? "🛡️ Administrator" : "Neighbor"}
            </span>
            {convexUser.isTrustedLender && (
              <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                ✓ Trusted Lender
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
