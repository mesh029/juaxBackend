"use client";

import { useCallback, useEffect, useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { api } from "@/lib/api/client";
import type { PublicListing, LaundryStation } from "@/lib/api/types";
import {
  forwardGeocode,
  getCurrentPosition,
  hasMapboxToken,
  KISUMU_CENTER,
  reverseGeocode,
  type GeocodeResult,
} from "@/lib/mapbox";
import { AppShell } from "@/components/layout/app-shell";
import { ListingsMap } from "@/components/map/listings-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatKes } from "@/lib/utils";

export default function ExplorePage() {
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [stations, setStations] = useState<LaundryStation[]>([]);
  const [center, setCenter] = useState(KISUMU_CENTER);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [place, setPlace] = useState<GeocodeResult | null>(null);
  const [query, setQuery] = useState("Kisumu");
  const [radiusKm, setRadiusKm] = useState(10);
  const [loading, setLoading] = useState(false);

  const loadNearby = useCallback(async (lat: number, lng: number, radius: number) => {
    setLoading(true);
    try {
      const res = await api.nearby(lat, lng, radius);
      setListings(res.listings);
      setCenter(res.center);
      setRadiusKm(res.radiusKm);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.laundryStations().then(setStations);
    loadNearby(KISUMU_CENTER.lat, KISUMU_CENTER.lng, 10);
  }, [loadNearby]);

  async function handleGeocode() {
    const result = await forwardGeocode(query);
    if (!result) return;
    setPlace(result);
    setCenter({ lat: result.lat, lng: result.lng });
    await loadNearby(result.lat, result.lng, radiusKm);
  }

  async function handleMyLocation() {
    const pos = await getCurrentPosition();
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    setUserLocation({ lat, lng });
    setCenter({ lat, lng });
    const geo = await reverseGeocode(lat, lng);
    if (geo) setPlace(geo);
    await loadNearby(lat, lng, radiusKm);
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Explore map</h1>
            <p className="text-muted-foreground">
              Mapbox geocoding + nearby listings API
              {!hasMapboxToken() && " (add token for full map)"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleMyLocation} disabled={loading}>
              <LocateFixed />
              My location
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Search & radius</CardTitle>
            <CardDescription>
              Coordinates are passed to <code className="text-xs">GET /listings/nearby</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGeocode()}
                placeholder="Nyamasaria, Kisumu…"
              />
            </div>
            <Input
              type="number"
              className="w-full sm:w-28"
              value={radiusKm}
              min={1}
              max={50}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
            />
            <Button onClick={handleGeocode} disabled={loading || !hasMapboxToken()}>
              Search
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="overflow-hidden lg:col-span-3">
            <CardContent className="p-0">
              <ListingsMap
                listings={listings}
                stations={stations}
                userLocation={userLocation}
                center={center}
                className="min-h-[420px]"
              />
            </CardContent>
          </Card>

          <div className="space-y-3 lg:col-span-2">
            {place && (
              <Card>
                <CardContent className="pt-4 text-sm">
                  <p className="font-medium">{place.placeName}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {radiusKm} km radius · {listings.length} listings
                  </Badge>
                </CardContent>
              </Card>
            )}

            {listings.map((l) => (
              <Card key={l.id}>
                <CardContent className="flex items-center justify-between gap-3 pt-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.title}</p>
                    <p className="text-xs text-muted-foreground">{l.neighborhood}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{formatKes(l.priceKes)}</p>
                    {l.distanceKm !== undefined && (
                      <p className="text-xs text-muted-foreground">{l.distanceKm} km</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
