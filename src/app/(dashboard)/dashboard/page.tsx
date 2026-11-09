import Link from "next/link";
import { getCurrentUser, getUserRole } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const role = await getUserRole();

  const greetingName = user?.firstName ?? user?.username ?? "Neighbor";

  return (
    <div className="space-y-6">
      {/* Welcome Hero */}
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Welcome back, {greetingName}
            </h1>
            <Badge variant={role === "admin" ? "accent" : "neutral"}>
              {role === "admin" ? "Administrator" : "Community Member"}
            </Badge>
            <InfoTooltip text="Manage your listed tools, incoming reservation requests, and borrowed items from one place." />
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
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
                Your Shared Tools
              </span>
              <span className="text-lg">🛠️</span>
            </div>
            <div className="flex items-center gap-2">
              <CardTitle>My Tool Listings</CardTitle>
              <InfoTooltip text="Create listings, toggle maintenance availability, and manage your equipment inventory." />
            </div>
            <CardDescription>
              Tools you are sharing with your neighborhood.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/listings">
              <Button variant="outline" size="sm" className="w-full">
                Manage My Listings &rarr;
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
                Lending Queue
              </span>
              <span className="text-lg">📬</span>
            </div>
            <div className="flex items-center gap-2">
              <CardTitle>Incoming Loan Requests</CardTitle>
              <InfoTooltip text="Review reservation dates, approve or decline requests, and mark returned equipment." />
            </div>
            <CardDescription>
              Neighbors asking to borrow your listed tools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/incoming">
              <Button variant="outline" size="sm" className="w-full">
                Review Incoming Requests &rarr;
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
                Your Reservations
              </span>
              <span className="text-lg">📋</span>
            </div>
            <div className="flex items-center gap-2">
              <CardTitle>My Borrowing Requests</CardTitle>
              <InfoTooltip text="Track reservation approval status, due dates, and items currently in your possession." />
            </div>
            <CardDescription>
              Tools you have requested or borrowed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/requests">
              <Button variant="outline" size="sm" className="w-full">
                View My Requests &rarr;
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
                Neighborhood Catalog
              </span>
              <span className="text-lg">🔍</span>
            </div>
            <div className="flex items-center gap-2">
              <CardTitle>Browse Community Tools</CardTitle>
              <InfoTooltip text="Filter by category, check equipment conditions, and request items for upcoming projects." />
            </div>
            <CardDescription>
              Reserve equipment available in your community.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                <div className="flex items-center gap-2">
                  <CardTitle className="text-amber-900">Admin Control Panel</CardTitle>
                  <InfoTooltip text="Full administrative oversight to view all active community loans, designate trusted lenders, and moderate listings." />
                </div>
                <CardDescription className="text-amber-700">
                  Moderation, loan audits, and trusted lender badges.
                </CardDescription>
              </div>
              <Badge variant="accent">Admin Only</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/admin">
              <Button variant="outline" size="sm" className="bg-white">
                Open Admin Panel &rarr;
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
