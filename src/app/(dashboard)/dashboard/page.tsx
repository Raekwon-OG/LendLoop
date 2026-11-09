import Link from "next/link";
import { getCurrentUser, getUserRole } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const role = await getUserRole();

  const greetingName = user?.firstName ?? user?.username ?? "Neighbor";

  return (
    <div className="space-y-6">
      {/* Welcome Hero */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                Welcome back, {greetingName}!
              </h1>
              <Badge variant={role === "admin" ? "accent" : "neutral"}>
                {role === "admin" ? "Administrator" : "Community Member"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-stone-600">
              Manage your listed tools, incoming requests, and borrowed items.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/tools">
              <Button variant="outline" size="sm">
                Browse Catalog
              </Button>
            </Link>
            <Link href="/dashboard/listings">
              <Button size="sm">List a Tool</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Navigation Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Your Shared Tools
              </span>
              <span className="text-lg">🛠️</span>
            </div>
            <CardTitle>My Tool Listings</CardTitle>
            <CardDescription>
              Tools you are currently sharing with your neighborhood lending loop.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500 mb-4">
              Create listings, toggle maintenance availability, and manage your equipment inventory.
            </p>
            <Link href="/dashboard/listings">
              <Button variant="outline" size="sm" className="w-full">
                Manage My Listings &rarr;
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Lending Queue
              </span>
              <span className="text-lg">📬</span>
            </div>
            <CardTitle>Incoming Loan Requests</CardTitle>
            <CardDescription>
              Neighbors asking to borrow one of your listed community tools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500 mb-4">
              Review reservation dates, approve or decline requests, and mark returned equipment.
            </p>
            <Link href="/dashboard/incoming">
              <Button variant="outline" size="sm" className="w-full">
                Review Incoming Requests &rarr;
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Your Reservations
              </span>
              <span className="text-lg">📋</span>
            </div>
            <CardTitle>My Borrowing Requests</CardTitle>
            <CardDescription>
              Pending, approved, and active tools you have requested to borrow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500 mb-4">
              Track reservation approval status, due dates, and items currently in your possession.
            </p>
            <Link href="/dashboard/requests">
              <Button variant="outline" size="sm" className="w-full">
                View My Requests &rarr;
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Neighborhood Catalog
              </span>
              <span className="text-lg">🔍</span>
            </div>
            <CardTitle>Browse Community Tools</CardTitle>
            <CardDescription>
              Search and reserve equipment available across your local community.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500 mb-4">
              Filter by category, check equipment conditions, and request items for upcoming projects.
            </p>
            <Link href="/dashboard/tools">
              <Button variant="outline" size="sm" className="w-full">
                Browse Community Tools &rarr;
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {role === "admin" && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-amber-900">Admin Control Panel</CardTitle>
                <CardDescription className="text-amber-700">
                  Platform moderation, global loan audits, and trusted lender designation.
                </CardDescription>
              </div>
              <Badge variant="accent">Admin Only</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-amber-800 mb-3">
              Full administrative oversight to view all active community loans, designate trusted lenders, and moderate listings.
            </p>
            <div>
              <Link href="/dashboard/admin">
                <Button variant="outline" size="sm" className="bg-white">
                  Open Admin Panel &rarr;
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
