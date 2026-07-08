"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Home, MessageSquare, RefreshCw, Send, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { ListingRequestRecord } from "@/lib/api/types";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

const STATUSES = [
  "",
  "requested",
  "agent_contacted",
  "rider_assigned",
  "rider_en_route",
  "viewing_completed",
  "cancelled",
];

const KINDS = ["", "viewing", "tour", "stay"];

const STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  agent_contacted: "Agent contacted",
  rider_assigned: "Rider assigned",
  rider_en_route: "Rider on the way",
  viewing_completed: "Viewing done",
  cancelled: "Cancelled",
};

function kindLabel(kind: string) {
  if (kind === "viewing") return "House viewing";
  if (kind === "tour") return "BnB tour";
  return "Stay inquiry";
}

export default function AdminListingRequestsPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<ListingRequestRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [sending, setSending] = useState(false);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminListingRequests({
        status: statusFilter || undefined,
        kind: kindFilter || undefined,
      });
      setItems(data.requests);
      if (selectedId && !data.requests.some((r) => r.id === selectedId)) {
        setSelectedId(null);
      }
    } catch (e) {
      const err = e instanceof ApiError ? e : ApiError.network(String(e));
      toast.error(err.headline(), { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, kindFilter, selectedId]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  useEffect(() => {
    if (!isAdmin) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void load();
    }, 8000);
    return () => clearInterval(timer);
  }, [isAdmin, load]);

  useEffect(() => {
    if (selected) {
      setRiderName(selected.riderName ?? "");
      setRiderPhone(selected.riderPhone ?? "");
    }
  }, [selected]);

  async function patchRequest(id: string, body: Record<string, unknown>, toastLabel: string) {
    try {
      const { request } = await api.updateListingRequest(id, body);
      setItems((prev) => prev.map((r) => (r.id === id ? request : r)));
      toast.success(toastLabel);
    } catch (e) {
      const err = e instanceof ApiError ? e : ApiError.network(String(e));
      toast.error(err.headline(), { description: err.message });
    }
  }

  async function sendMessage() {
    if (!selected || !messageDraft.trim()) return;
    setSending(true);
    try {
      const { request } = await api.sendListingRequestMessage(selected.id, { body: messageDraft.trim() });
      setItems((prev) => prev.map((r) => (r.id === selected.id ? request : r)));
      setMessageDraft("");
      toast.success("Message sent to user");
    } catch (e) {
      const err = e instanceof ApiError ? e : ApiError.network(String(e));
      toast.error(err.headline(), { description: err.message });
    } finally {
      setSending(false);
    }
  }

  async function assignRider() {
    if (!selected || !riderName.trim()) {
      toast.error("Enter rider name");
      return;
    }
    await patchRequest(
      selected.id,
      { status: "rider_assigned", riderName: riderName.trim(), riderPhone: riderPhone.trim() || undefined },
      "Rider assigned",
    );
    await api.sendListingRequestMessage(selected.id, {
      body: `${riderName.trim()} will pick you up for your viewing. ${riderPhone.trim() ? `Contact: ${riderPhone.trim()}` : ""}`.trim(),
    }).then(({ request }) => {
      setItems((prev) => prev.map((r) => (r.id === selected.id ? request : r)));
    }).catch(() => {});
    await load();
  }

  async function markRiderEnRoute() {
    if (!selected) return;
    await patchRequest(selected.id, { status: "rider_en_route" }, "Rider marked en route");
    await api.sendListingRequestMessage(selected.id, {
      body: "Your rider is on the way to pick you up for the viewing.",
    }).then(({ request }) => {
      setItems((prev) => prev.map((r) => (r.id === selected.id ? request : r)));
    }).catch(() => {});
    await load();
  }

  async function markViewingComplete() {
    if (!selected) return;
    await patchRequest(selected.id, { status: "viewing_completed" }, "Viewing marked complete");
    await api.sendListingRequestMessage(selected.id, {
      body: "Your viewing is complete. Thank you for using Jua X — reach out anytime if you need follow-up.",
    }).then(({ request }) => {
      setItems((prev) => prev.map((r) => (r.id === selected.id ? request : r)));
    }).catch(() => {});
    await load();
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
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Home className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Listing requests</h1>
              <p className="text-muted-foreground">
                Viewings & tours — message users, assign riders, track journey
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
                {s ? STATUS_LABELS[s] ?? s.replace(/_/g, " ") : "All status"}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Tabs value={kindFilter} onValueChange={setKindFilter}>
          <TabsList>
            {KINDS.map((k) => (
              <TabsTrigger key={k || "all"} value={k} className="capitalize">
                {k ? kindLabel(k) : "All types"}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            {items.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No listing requests yet.
                </CardContent>
              </Card>
            ) : (
              items.map((item) => (
                <Card
                  key={item.id}
                  className={`cursor-pointer transition-colors ${selectedId === item.id ? "border-primary ring-1 ring-primary/30" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{kindLabel(item.kind)}</Badge>
                      <Badge variant="outline" className="uppercase">{item.service}</Badge>
                      <Badge>{STATUS_LABELS[item.status] ?? item.status}</Badge>
                    </div>
                    <CardTitle className="mt-2 text-base">{item.listingTitle}</CardTitle>
                    <CardDescription>
                      {item.user?.displayName ?? item.user?.phone ?? "User"} ·{" "}
                      {item.listing?.neighborhood ?? "—"} · {new Date(item.createdAt).toLocaleString()}
                      {item.pickupModeLabel ? ` · ${item.pickupModeLabel}` : ""}
                    </CardDescription>
                  </CardHeader>
                  {item.userNote ? (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.userNote}</p>
                    </CardContent>
                  ) : null}
                </Card>
              ))
            )}
          </div>

          <div className="lg:sticky lg:top-4 lg:self-start">
            {!selected ? (
              <Card className="border-dashed">
                <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 opacity-40" />
                  <p>Select a request to message the user and update status.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selected.listingTitle}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selected.user?.displayName ?? "Guest"} · {selected.user?.phone}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{STATUS_LABELS[selected.status] ?? selected.status}</Badge>
                    {selected.pickupModeLabel ? (
                      <Badge variant="secondary">Pickup: {selected.pickupModeLabel}</Badge>
                    ) : null}
                    {selected.riderName ? (
                      <Badge variant="outline">
                        {selected.pickupMode === "taxi" ? "Driver" : "Rider"}: {selected.riderName}
                      </Badge>
                    ) : null}
                  </div>

                  {selected.userNote ? (
                    <div className="rounded-md bg-muted/50 p-3 text-sm">
                      <p className="font-medium text-muted-foreground">User note</p>
                      <p className="mt-1 whitespace-pre-wrap">{selected.userNote}</p>
                    </div>
                  ) : null}

                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                    {(selected.messages ?? []).map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-lg px-3 py-2 text-sm ${
                          m.senderRole === "admin"
                            ? "ml-6 bg-primary/10"
                            : m.senderRole === "user"
                              ? "mr-6 bg-muted"
                              : "bg-muted/40 text-center text-xs text-muted-foreground"
                        }`}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {m.senderRole}
                        </p>
                        <p className="whitespace-pre-wrap">{m.body}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Message to user (they can reply in the app)…"
                      value={messageDraft}
                      onChange={(e) => setMessageDraft(e.target.value)}
                      rows={3}
                    />
                    <Button className="w-full" onClick={sendMessage} disabled={sending || !messageDraft.trim()}>
                      <Send className="mr-2 h-4 w-4" />
                      Send message
                    </Button>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm font-medium">Rider dispatch</p>
                    <Input
                      placeholder="Rider name"
                      value={riderName}
                      onChange={(e) => setRiderName(e.target.value)}
                    />
                    <Input
                      placeholder="Rider phone (optional)"
                      value={riderPhone}
                      onChange={(e) => setRiderPhone(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={assignRider}>
                        Assign rider
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={markRiderEnRoute}
                        disabled={selected.status !== "rider_assigned" && selected.status !== "agent_contacted"}
                      >
                        Rider on the way
                      </Button>
                      <Button size="sm" onClick={markViewingComplete}>
                        Viewing done
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
