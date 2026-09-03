import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminTenants() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tenants</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No tenants yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
