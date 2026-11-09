import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-stone-900">
              Community Administration Panel
            </CardTitle>
            <Badge variant="accent">Administrator Access</Badge>
          </div>
          <CardDescription>
            Manage community members, moderate equipment listings, and designate Trusted Lenders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-stone-200 bg-white p-4">
              <span className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
                Access Level
              </span>
              <p className="mt-1 text-lg font-bold text-emerald-800">Super Admin</p>
              <p className="mt-0.5 text-xs text-stone-500">Full moderation rights</p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-white p-4">
              <span className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
                Trusted Lenders
              </span>
              <p className="mt-1 text-lg font-bold text-stone-900">Active</p>
              <p className="mt-0.5 text-xs text-stone-500">Endorsement system ready</p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-white p-4">
              <span className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
                Audit Scope
              </span>
              <p className="mt-1 text-lg font-bold text-stone-900">All Neighborhoods</p>
              <p className="mt-0.5 text-xs text-stone-500">Global loan oversight</p>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
            <h4 className="text-sm font-semibold text-stone-900">
              User & Listing Management Controls
            </h4>
            <p className="mx-auto mt-1 max-w-lg text-sm text-stone-500">
              Backend operations (<code>users.setRole</code>, <code>users.setTrustedLender</code>,
              and listing removal) are fully active in Convex. The interactive moderation UI will be
              connected in Phase 6.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
