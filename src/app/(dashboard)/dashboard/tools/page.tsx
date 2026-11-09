import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";

export default function BrowseToolsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Browse Community Tools</CardTitle>
        <CardDescription>Search and borrow tools listed by your neighbors.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed border-stone-300 p-12 text-center">
          <p className="text-sm text-stone-500">
            Interactive search, filtering, and reservation requests will be activated in Phase 3 &
            5.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
