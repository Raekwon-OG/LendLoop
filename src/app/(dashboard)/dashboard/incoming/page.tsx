import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";

export default function IncomingRequestsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Incoming Loan Requests</CardTitle>
        <CardDescription>
          Review and approve requests from neighbors who wish to borrow your tools.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed border-stone-300 p-12 text-center">
          <p className="text-sm text-stone-500">
            Approve/decline workflows and loan scheduling will be implemented in Phase 5.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
