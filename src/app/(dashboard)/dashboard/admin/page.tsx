import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getUserRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const role = await getUserRole();

  if (role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Community Administration</CardTitle>
          <Badge variant="accent">Admin Privileges</Badge>
        </div>
        <CardDescription>
          Listing moderation, loan oversight, and trusted lender designation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed border-stone-300 p-12 text-center">
          <p className="text-sm text-stone-500">
            Administrative controls, global loan auditing, and trusted lender management will be
            built in Phase 6.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
