"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Droplets, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { LaundryOrder } from "@/lib/api/types";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatKes } from "@/lib/utils";
import { orderStepLabels } from "@/lib/laundry/status";
import { trackingEventsForMode } from "@/lib/laundry/tracking-events";

const STATUSES = ["", "requested", "pickup_scheduled", "collected", "processing", "ready", "delivered"];

export default function AdminRequestsPage() {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<LaundryOrder[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminLaundryOrders(filter || undefined);
      setOrders(data);
      setError(null);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setError(msg);
      toast.error("Could not load orders", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  async function advance(order: LaundryOrder) {
    const statusMap = [
      "requested",
      "pickup_scheduled",
      "collected",
      "processing",
      "ready",
      "delivered",
    ] as const;
    const nextStatus = statusMap[order.currentStep + 1];
    if (!nextStatus) return;
    try {
      await api.updateOrderStatus(order.id, nextStatus);
      toast.success(`Moved to ${nextStatus.replace("_", " ")}`);
      await load();
    } catch (e) {
      const err = e instanceof ApiError ? e : ApiError.network(String(e));
      toast.error(err.headline(), { description: err.message });
    }
  }

  async function logTracking(order: LaundryOrder, kind: string, label: string) {
    try {
      await api.logOrderTracking(order.id, kind);
      toast.success(label);
      await load();
    } catch (e) {
      const err = e instanceof ApiError ? e : ApiError.network(String(e));
      toast.error(err.headline(), { description: err.message });
    }
  }

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
            <Droplets className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">FUA request queue</h1>
              <p className="text-muted-foreground">
                Laundry pickups, station drops & Mama Fua — log rider/station checkpoints
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

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="flex h-auto flex-wrap">
            {STATUSES.map((s) => (
              <TabsTrigger key={s || "all"} value={s} className="capitalize">
                {s ? s.replace("_", " ") : "All"}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {orders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              No orders in this queue.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const quickEvents = trackingEventsForMode(order.pickupMode).filter(
                (e) => e.kind !== "order_placed" && e.kind !== "note",
              );
              const loggedKinds = new Set(order.tracking?.map((t) => t.kind) ?? []);

              return (
                <Card key={order.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base">{order.pickupLabel}</CardTitle>
                          {order.serviceType === "mamafua" && (
                            <Badge variant="secondary">Mama Fua</Badge>
                          )}
                        </div>
                        <CardDescription>
                          {order.customer?.displayName ?? order.customer?.phone ?? "Customer"} ·{" "}
                          {order.loadLabel} · {order.scheduleBand} · {order.scheduleDate}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatKes(order.totalKes)}</p>
                        <Badge className="mt-1 capitalize">{order.status.replace("_", " ")}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {order.steps.map((step, i) => (
                        <Badge
                          key={step}
                          variant={i <= order.currentStep ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {step}
                        </Badge>
                      ))}
                    </div>

                    {order.taskLabels && order.taskLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {order.taskLabels.map((task) => (
                          <Badge key={task} variant="outline" className="text-[10px]">
                            {task}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {order.tracking && order.tracking.length > 0 && (
                      <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Activity log
                        </p>
                        <ul className="space-y-2">
                          {order.tracking.map((ev) => (
                            <li key={ev.id} className="flex flex-wrap gap-x-2 text-sm">
                              <span className="font-medium">{ev.label}</span>
                              <span className="text-muted-foreground">
                                · {ev.actorRole}
                                {ev.createdBy?.name ? ` · ${ev.createdBy.name}` : ""}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(ev.createdAt).toLocaleString()}
                              </span>
                              {ev.note && (
                                <span className="w-full text-xs text-muted-foreground">{ev.note}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Log checkpoint</p>
                      <div className="flex flex-wrap gap-1">
                        {quickEvents.map((ev) => (
                          <Button
                            key={ev.kind}
                            size="sm"
                            variant={loggedKinds.has(ev.kind) ? "secondary" : "outline"}
                            className="h-7 text-[10px]"
                            onClick={() => logTracking(order, ev.kind, ev.label)}
                          >
                            {ev.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {order.adminNotes && (
                      <p className="text-sm text-muted-foreground">Note: {order.adminNotes}</p>
                    )}
                    {order.status !== "delivered" && order.status !== "cancelled" && (
                      <Button size="sm" onClick={() => advance(order)}>
                        Advance to {orderStepLabels(order.pickupMode)[order.currentStep + 1] ?? "done"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
