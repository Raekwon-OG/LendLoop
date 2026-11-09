import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { requireAdminUser } from "@/lib/auth";
import { AdminDashboardPanel } from "@/components/admin/AdminDashboardPanel";

export default async function AdminPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold text-stone-900">
                Community Administration Panel
              </CardTitle>
              <InfoTooltip text="Manage community members, moderate equipment listings, and designate Trusted Lenders." />
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
