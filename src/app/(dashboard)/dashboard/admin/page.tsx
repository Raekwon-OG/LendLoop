import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { requireAdminUser } from "@/lib/auth";
import { AdminDashboardPanel } from "@/components/admin/AdminDashboardPanel";

export default async function AdminPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-stone-900">
                Community Administration Panel
              </CardTitle>
              <CardDescription className="mt-1">
                Manage community members, moderate equipment listings, and designate Trusted Lenders.
              </CardDescription>
            </div>
            <Badge variant="accent">Administrator Access</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Interactive Controls & Oversight */}
      <AdminDashboardPanel />
    </div>
  );
}
