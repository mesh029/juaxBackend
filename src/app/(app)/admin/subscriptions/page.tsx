"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatKes } from "@/lib/utils";

type AdminSub = {
  id: string;
  plan: string;
  priceKes: number;
  paymentStatus: string;
  active: boolean;
  mpesaReceipt: string | null;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
  eligibility: { plan: string; label: string; unlocks: string[] };
  customer: { phone: string; displayName: string | null; county: string | null } | null;
};

const PLANS = ["", "daily", "weekly", "monthly"];

export default function AdminSubscriptionsPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<AdminSub[]>([]);
  const [summary, setSummary] = useState({ total: 0, activeCount: 0 });
  const [planFilter, setPlanFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminSubscriptions(planFilter || undefined);
      setItems(data.subscriptions);
      setSummary(data.summary);
    } catch (e) {
      const err = e instanceof ApiError ? e : ApiError.network(String(e));
      toast.error(err.headline(), { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [planFilter]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>Admin only</CardTitle>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Subscriptions</h1>
              <p className="text-muted-foreground">
                Saka Keja rental unlocks — dummy M-Pesa in pilot; real Daraja in production
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">← Admin</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Active now</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Shown</CardTitle>
              <CardDescription>Latest 200 records</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.total}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={planFilter} onValueChange={setPlanFilter}>
          <TabsList>
            {PLANS.map((p) => (
              <TabsTrigger key={p || "all"} value={p} className="capitalize">
                {p || "All plans"}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {items.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                No subscriptions yet.
              </CardContent>
            </Card>
          ) : (
            items.map((sub) => (
              <Card key={sub.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base capitalize">
                        {sub.eligibility.label} · {formatKes(sub.priceKes)}
                      </CardTitle>
                      <CardDescription>
                        {sub.customer?.displayName ?? sub.customer?.phone ?? "User"} ·{" "}
                        {sub.customer?.county ?? "—"} ·{" "}
                        {new Date(sub.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={sub.active ? "default" : "outline"}>
                        {sub.active ? "Active" : "Expired / pending"}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">
                        {sub.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Valid {new Date(sub.startsAt).toLocaleDateString()} →{" "}
                    {new Date(sub.expiresAt).toLocaleDateString()}
                    {sub.mpesaReceipt ? ` · Receipt: ${sub.mpesaReceipt}` : ""}
                  </p>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Eligible for</p>
                    <ul className="mt-1 list-inside list-disc text-sm">
                      {sub.eligibility.unlocks.map((u) => (
                        <li key={u}>{u}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
