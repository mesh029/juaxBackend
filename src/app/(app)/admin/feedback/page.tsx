"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, RefreshCw, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { ServiceFeedback } from "@/lib/api/types";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SERVICES = ["", "fua", "mamafua", "bnb", "rental", "general", "app"];
const STATUSES = ["", "new", "reviewed", "resolved"];

function Stars({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-600">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < rating ? "fill-current" : "opacity-30"}`}
        />
      ))}
      <span className="ml-1 text-xs">{rating}/5</span>
    </span>
  );
}

export default function AdminFeedbackPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<ServiceFeedback[]>([]);
  const [summary, setSummary] = useState({ newCount: 0, avgRating: null as number | null });
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminFeedback({
        status: statusFilter || undefined,
        service: serviceFilter || undefined,
      });
      setItems(data.feedback);
      setSummary(data.summary);
    } catch (e) {
      const err = e instanceof ApiError ? e : ApiError.network(String(e));
      toast.error(err.headline(), { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, serviceFilter]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  async function markStatus(item: ServiceFeedback, status: string) {
    try {
      await api.updateFeedback(item.id, { status });
      toast.success(`Marked ${status}`);
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
            <MessageSquare className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Service feedback</h1>
              <p className="text-muted-foreground">
                Ratings, Mama Fua complaints, and suggestions from users
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">New</CardTitle>
              <CardDescription>Awaiting review</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.newCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Avg rating</CardTitle>
              <CardDescription>All rated feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.avgRating ?? "—"}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="flex h-auto flex-wrap">
            {STATUSES.map((s) => (
              <TabsTrigger key={s || "all-status"} value={s} className="capitalize">
                {s || "All status"}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Tabs value={serviceFilter} onValueChange={setServiceFilter}>
          <TabsList className="flex h-auto flex-wrap">
            {SERVICES.map((s) => (
              <TabsTrigger key={s || "all-svc"} value={s} className="uppercase">
                {s || "All services"}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {items.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                No feedback yet. Users submit via{" "}
                <code className="text-xs">POST /api/v1/feedback</code>
              </CardContent>
            </Card>
          ) : (
            items.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="uppercase">
                          {item.service}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {item.category}
                        </Badge>
                        <Badge
                          variant={
                            item.status === "new"
                              ? "default"
                              : item.status === "resolved"
                                ? "success"
                                : "outline"
                          }
                          className="capitalize"
                        >
                          {item.status}
                        </Badge>
                      </div>
                      {item.title && (
                        <CardTitle className="mt-2 text-base">{item.title}</CardTitle>
                      )}
                      <CardDescription>
                        {item.user?.displayName ?? item.user?.phone ?? "Anonymous"} ·{" "}
                        {new Date(item.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Stars rating={item.rating} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm whitespace-pre-wrap">{item.body}</p>
                  {item.orderId && (
                    <p className="text-xs text-muted-foreground">Order: {item.orderId}</p>
                  )}
                  {item.adminNotes && (
                    <p className="text-sm text-muted-foreground">Admin: {item.adminNotes}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {item.status !== "reviewed" && (
                      <Button size="sm" variant="outline" onClick={() => markStatus(item, "reviewed")}>
                        Mark reviewed
                      </Button>
                    )}
                    {item.status !== "resolved" && (
                      <Button size="sm" variant="outline" onClick={() => markStatus(item, "resolved")}>
                        Resolve
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Button asChild variant="outline">
          <Link href="/admin">← Admin</Link>
        </Button>
      </div>
    </AppShell>
  );
}
