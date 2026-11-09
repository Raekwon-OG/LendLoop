import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";

export default function MyListingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Tool Listings</CardTitle>
        <CardDescription>
          Add, edit, or archive equipment you are sharing with the neighborhood.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed border-stone-300 p-12 text-center">
          <p className="text-sm text-stone-500">
            Tool creation form and listings management will be introduced in Phase 4.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
