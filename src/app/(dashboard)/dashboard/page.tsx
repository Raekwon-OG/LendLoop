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
          <div>
            <Link href="/dashboard/listings">
              <Button size="sm">List a Tool</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Navigation Placeholders */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Tool Listings</CardTitle>
            <CardDescription>
              Tools you are currently sharing with your neighborhood.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-6 text-center">
              <p className="text-sm text-stone-500">
                Tool management module will connect to Convex in Phase 4.
              </p>
              <div className="mt-3">
                <Link href="/dashboard/listings">
                  <Button variant="outline" size="sm">
                    View Listings Placeholder
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Borrowing Requests</CardTitle>
            <CardDescription>
              Pending and active tools you have requested to borrow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-6 text-center">
              <p className="text-sm text-stone-500">
                Borrowing lifecycle module will connect to Convex in Phase 5.
              </p>
              <div className="mt-3">
                <Link href="/dashboard/requests">
                  <Button variant="outline" size="sm">
                    View Requests Placeholder
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incoming Loan Requests</CardTitle>
            <CardDescription>Neighbors asking to borrow one of your listed tools.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-6 text-center">
              <p className="text-sm text-stone-500">
                Incoming approval queue will activate with loan management.
              </p>
              <div className="mt-3">
                <Link href="/dashboard/incoming">
                  <Button variant="outline" size="sm">
                    View Incoming Placeholder
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Community Directory</CardTitle>
            <CardDescription>Explore tools available across your local community.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-6 text-center">
              <p className="text-sm text-stone-500">
                Search and category filtering across shared equipment.
              </p>
              <div className="mt-3">
                <Link href="/dashboard/tools">
                  <Button variant="outline" size="sm">
                    Browse Catalog
                  </Button>
                </Link>
              </div>
            </div>
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
                  Moderation, loan oversight, and trusted lender designation.
                </CardDescription>
              </div>
              <Badge variant="accent">Admin Only</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800">
              Admin listing moderation and loan audit views will be wired in Phase 6.
            </p>
            <div className="mt-3">
              <Link href="/dashboard/admin">
                <Button variant="outline" size="sm" className="bg-white">
                  Open Admin Panel Placeholder
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
