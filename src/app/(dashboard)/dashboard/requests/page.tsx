import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";

export default function MyRequestsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Borrowing Requests</CardTitle>
        <CardDescription>Track the status of tools you have requested to borrow.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed border-stone-300 p-12 text-center">
          <p className="text-sm text-stone-500">
            Borrowing requests and active loan tracking will be connected in Phase 5.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
