"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api/client";
import { ApiError, mapListingFieldErrors } from "@/lib/api/errors";
import type { AdminListing } from "@/lib/api/types";
import {
  formToPayload,
  INITIAL_LISTING_FORM,
  listingToForm,
  validateListingForm,
  type ListingFormState,
} from "@/lib/listings/listing-form-state";
import { ListingFormFields } from "@/components/admin/listing-form-fields";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatKes } from "@/lib/utils";

function AdminListingsContent() {
  const { isAdmin, isAgent } = useAuth();
  const canManage = isAdmin || isAgent;
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "form" ? "form" : "list";
  const editId = searchParams.get("edit");

  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<ListingFormState>(INITIAL_LISTING_FORM);

  const load = useCallback(async () => {
    const res = isAdmin ? await api.adminListings() : await api.agentListings();
    setListings(res.listings);
  }, [isAdmin]);

  useEffect(() => {
    if (!canManage) return;
    load().catch((e) => {
      const msg = e instanceof ApiError ? e.message : String(e);
      setListError(msg);
      toast.error("Could not load listings", { description: msg });
    });
  }, [isAdmin, canManage, load]);

  useEffect(() => {
    if (!canManage || !editId) {
      if (tab === "form" && !editId) setForm(INITIAL_LISTING_FORM);
      return;
    }
    setFormLoading(true);
    const fetchListing = isAdmin ? api.adminListing(editId) : api.agentListing(editId);
    fetchListing
      .then(({ listing }) => setForm(listingToForm(listing)))
      .catch((e) => {
        const err = e instanceof ApiError ? e : ApiError.network(String(e));
        toast.error("Could not load listing", { description: err.message });
        router.push("/admin/listings?tab=list");
      })
      .finally(() => setFormLoading(false));
  }, [isAdmin, canManage, editId, tab, router]);

  function goToList() {
    router.push("/admin/listings?tab=list");
  }

  function goToCreate() {
    setForm(INITIAL_LISTING_FORM);
    setFieldErrors({});
    setFormError(null);
    router.push("/admin/listings?tab=form");
  }

  function goToEdit(id: string) {
    setFieldErrors({});
    setFormError(null);
    router.push(`/admin/listings?tab=form&edit=${id}`);
  }

  function handleApiError(e: unknown) {
    if (e instanceof ApiError) {
      setFormError(e.message);
      if (Object.keys(e.fieldErrors).length) {
        setFieldErrors(mapListingFieldErrors(e.fieldErrors));
      }
      toast.error(e.headline(), { description: e.message });
      return;
    }
    setFormError(String(e));
    toast.error("Something went wrong", { description: String(e) });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const clientErrors = validateListingForm(form);
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      toast.error("Fix form errors", {
        description: Object.values(clientErrors)[0],
      });
      return;
    }

    setLoading(true);
    try {
      const payload = formToPayload(form);
      if (editId) {
        const { publish: _p, ...patchBody } = payload;
        await (isAdmin ? api.updateListing(editId, patchBody) : api.updateAgentListing(editId, patchBody));
        toast.success("Listing updated");
      } else {
        await (isAdmin ? api.createListing(payload) : api.createAgentListing(payload));
        toast.success("Listing created");
      }
      await load();
      goToList();
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish(id: string) {
    try {
      await api.publishListing(id);
      toast.success("Listing published");
      await load();
    } catch (e) {
      handleApiError(e);
    }
  }

  async function handleArchive(id: string) {
    try {
      await api.archiveListing(id);
      toast.success("Listing archived");
      await load();
    } catch (e) {
      handleApiError(e);
    }
  }

  if (!canManage) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>Agents & admins only</CardTitle>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Manage listings</h1>
            <p className="text-muted-foreground">
              Full location, coordinates, county & amenities — exact address gated on public API
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin">← Admin</Link>
          </Button>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            if (v === "list") goToList();
            else goToCreate();
          }}
        >
          <TabsList>
            <TabsTrigger value="list">All listings</TabsTrigger>
            <TabsTrigger value="form">
              <Plus className="h-4 w-4" />
              {editId ? "Edit listing" : "Add new"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {listError && <p className="mb-4 text-sm text-destructive">{listError}</p>}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Coords</TableHead>
                      <TableHead>Amenities</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listings.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {l.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={l.status === "published" ? "success" : "outline"}
                            className="capitalize"
                          >
                            {l.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{l.locationName}</div>
                          <div className="text-xs capitalize text-muted-foreground">{l.county}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {l.approxPin.lat.toFixed(4)}, {l.approxPin.lng.toFixed(4)}
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-[140px] flex-wrap gap-1">
                            {l.amenities.slice(0, 3).map((a) => (
                              <Badge key={a} variant="outline" className="text-[10px]">
                                {a}
                              </Badge>
                            ))}
                            {l.amenities.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{l.amenities.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatKes(l.priceKes)}</TableCell>
                        <TableCell className="space-x-1 text-right">
                          <Button size="sm" variant="ghost" onClick={() => goToEdit(l.id)}>
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                          {l.status !== "published" && (
                            <Button size="sm" variant="outline" onClick={() => handlePublish(l.id)}>
                              Publish
                            </Button>
                          )}
                          {l.status !== "archived" && (
                            <Button size="sm" variant="ghost" onClick={() => handleArchive(l.id)}>
                              Archive
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="form" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {editId ? "Edit listing" : "New listing"}
                </CardTitle>
                <CardDescription>
                  Use the map, GPS, or type coordinates. Approx pin is public; exact is gated.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {formLoading ? (
                  <p className="text-sm text-muted-foreground">Loading listing…</p>
                ) : (
                  <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                    <ListingFormFields
                      form={form}
                      setForm={setForm}
                      fieldErrors={fieldErrors}
                      showPublish={!editId}
                    />
                    {formError && (
                      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 sm:col-span-2">
                        <p className="text-sm font-medium text-destructive">{formError}</p>
                      </div>
                    )}
                    <div className="flex gap-2 sm:col-span-2">
                      <Button type="submit" disabled={loading}>
                        {loading ? "Saving…" : editId ? "Save changes" : "Create listing"}
                      </Button>
                      <Button type="button" variant="outline" onClick={goToList}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

export default function AdminListingsPage() {
  return (
    <Suspense fallback={<AppShell><p className="p-6 text-muted-foreground">Loading…</p></AppShell>}>
      <AdminListingsContent />
    </Suspense>
  );
}
