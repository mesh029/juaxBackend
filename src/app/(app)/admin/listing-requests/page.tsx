"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Home, RefreshCw } from "lucide-react";
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

const STATUSES = ["", "new", "reviewed", "resolved"];
const SERVICES = ["", "rental", "bnb"];

function requestKind(title: string | null): string {
  if (!title) return "Request";
  if (/tour/i.test(title)) return "3D tour";
  if (/viewing/i.test(title)) return "Viewing";
  if (/stay/i.test(title)) return "Stay";
  return "Request";
}

export default function AdminListingRequestsPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<ServiceFeedback[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminListingRequests({
        status: statusFilter || undefined,
        service: serviceFilter || undefined,
      });
      setItems(data.feedback);
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
            <Home className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Listing requests</h1>
              <p className="text-muted-foreground">
                Rental viewings, BnB tours & stay inquiries from the mobile app
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

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="flex h-auto flex-wrap">
            {STATUSES.map((s) => (
              <TabsTrigger key={s || "all"} value={s} className="capitalize">
                {s || "All status"}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Tabs value={serviceFilter} onValueChange={setServiceFilter}>
          <TabsList>
            {SERVICES.map((s) => (
              <TabsTrigger key={s || "all"} value={s} className="uppercase">
                {s || "All types"}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {items.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                No listing requests yet.
              </CardContent>
            </Card>
          ) : (
            items.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{requestKind(item.title)}</Badge>
                        <Badge variant="outline" className="uppercase">
                          {item.service}
                        </Badge>
                        <Badge className="capitalize">{item.status}</Badge>
                      </div>
                      <CardTitle className="mt-2 text-base">
                        {item.listing?.title ?? item.title ?? "Listing request"}
                      </CardTitle>
                      <CardDescription>
                        {item.user?.displayName ?? item.user?.phone ?? "User"} ·{" "}
                        {item.listing?.neighborhood ?? "—"} ·{" "}
                        {new Date(item.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm whitespace-pre-wrap">{item.body}</p>
                  {item.listingId && (
                    <p className="text-xs text-muted-foreground">
                      Listing ID: {item.listingId}
                      {item.listing?.type ? ` · ${item.listing.type}` : ""}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {item.status === "new" && (
                      <Button size="sm" variant="outline" onClick={() => markStatus(item, "reviewed")}>
                        Mark reviewed
                      </Button>
                    )}
                    {item.status !== "resolved" && (
                      <Button size="sm" onClick={() => markStatus(item, "resolved")}>
                        Resolve
                      </Button>
                    )}
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
