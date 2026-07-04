"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Droplets, MapPin, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api/client";
import type { PublicListing, ServicesResponse } from "@/lib/api/types";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardCharts } from "@/components/dashboard/stats-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKes } from "@/lib/utils";

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [stations, setStations] = useState<{ length: number }>({ length: 0 });
  const [services, setServices] = useState<ServicesResponse | null>(null);
  const [dbOk, setDbOk] = useState(false);

  useEffect(() => {
    Promise.all([
      api.listings(),
      api.laundryStations(),
      api.services(),
      api.health(),
    ]).then(([l, s, svc, health]) => {
      setListings(l);
      setStations({ length: s.length });
      setServices(svc);
      setDbOk(health.db === "connected");
    });
  }, []);

  const rentals = listings.filter((l) => l.type === "rental").length;
  const bnbs = listings.filter((l) => l.type === "bnb").length;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge className="mb-3">Kisumu pilot</Badge>
            <h1 className="text-3xl font-bold tracking-tight text-balance">
              Jua X operations
            </h1>
            <p className="mt-1 max-w-xl text-muted-foreground">
              Live view of listings, laundry stations, and API health — your deployable
              console for Vercel.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/labs">API Lab</Link>
            </Button>
            <Button asChild>
              <Link href="/explore">
                Open map
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Listings" value={listings.length} hint="Published in Kisumu" icon={Building2} />
          <StatCard title="Rentals" value={rentals} hint="Vacant units" icon={MapPin} />
          <StatCard title="FUA stations" value={stations.length} hint="Active on map" icon={Droplets} />
          <StatCard
            title="API health"
            value={dbOk ? "Online" : "…"}
            hint={services?.rides.enabled === false ? "Rides coming soon" : "All services"}
            icon={ShieldCheck}
          />
        </div>

        <DashboardCharts rentalCount={rentals} bnbCount={bnbs} stationCount={stations.length} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest listings</CardTitle>
            <CardDescription>Approximate pins only — location gate active</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {listings.slice(0, 6).map((l) => (
                <Link
                  key={l.id}
                  href={`/listings?id=${l.id}`}
                  className="group rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={l.type === "bnb" ? "default" : "secondary"} className="capitalize">
                      {l.type}
                    </Badge>
                    {l.locationLocked && (
                      <Badge variant="outline" className="text-[10px]">
                        Locked
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 font-medium group-hover:text-primary">{l.title}</p>
                  <p className="text-sm text-muted-foreground">{l.neighborhood}</p>
                  <p className="mt-2 text-sm font-semibold">
                    {formatKes(l.priceKes)}
                    <span className="font-normal text-muted-foreground"> / {l.priceUnit}</span>
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
