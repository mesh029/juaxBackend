"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bed, Lock, MapPin } from "lucide-react";
import { api } from "@/lib/api/client";
import type { PublicListing } from "@/lib/api/types";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatKes } from "@/lib/utils";

export default function ListingsPageInner() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [filter, setFilter] = useState<"all" | "rental" | "bnb">("all");
  const [selected, setSelected] = useState<PublicListing | null>(null);

  useEffect(() => {
    const type = filter === "all" ? undefined : filter;
    api.listings({ type }).then(setListings);
  }, [filter]);

  useEffect(() => {
    if (selectedId) {
      api.listing(selectedId).then(setSelected).catch(() => setSelected(null));
    }
  }, [selectedId]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saka Keja listings</h1>
          <p className="text-muted-foreground">
            Live inventory from the API — gated fields stay server-side.
          </p>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="rental">Rentals</TabsTrigger>
            <TabsTrigger value="bnb">BnB</TabsTrigger>
          </TabsList>
          <TabsContent value={filter} className="mt-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-3 lg:col-span-2">
                {listings.map((l) => (
                  <Card
                    key={l.id}
                    className="cursor-pointer transition-colors hover:border-primary/40"
                    onClick={() => setSelected(l)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge className="capitalize">{l.type}</Badge>
                        <span className="text-sm font-semibold">{formatKes(l.priceKes)}</span>
                      </div>
                      <CardTitle className="text-base">{l.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {l.neighborhood}, {l.county}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Bed className="h-3.5 w-3.5" />
                        {l.beds} bed · {l.baths} bath
                      </span>
                      {l.locationLocked && (
                        <span className="flex items-center gap-1 text-amber-700">
                          <Lock className="h-3.5 w-3.5" />
                          Location locked
                        </span>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="h-fit lg:sticky lg:top-8">
                <CardHeader>
                  <CardTitle className="text-base">Detail</CardTitle>
                  <CardDescription>
                    {selected ? selected.title : "Select a listing"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {selected ? (
                    <>
                      <p>{selected.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {selected.amenities.map((a) => (
                          <Badge key={a} variant="outline">
                            {a}
                          </Badge>
                        ))}
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">
                        Pin: {selected.approxPin.lat.toFixed(4)},{" "}
                        {selected.approxPin.lng.toFixed(4)}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Click a card to preview.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
