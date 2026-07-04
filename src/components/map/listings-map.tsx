"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { PublicListing } from "@/lib/api/types";
import type { LaundryStation } from "@/lib/api/types";
import { getMapboxToken, hasMapboxToken, KISUMU_CENTER } from "@/lib/mapbox";
import { cn, formatKes } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Pin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  type: "listing" | "station" | "user";
};

type ListingsMapProps = {
  listings?: PublicListing[];
  stations?: LaundryStation[];
  userLocation?: { lat: number; lng: number } | null;
  center?: { lat: number; lng: number };
  className?: string;
  onPinClick?: (id: string, type: "listing" | "station") => void;
};

export function ListingsMap({
  listings = [],
  stations = [],
  userLocation,
  center,
  className,
  onPinClick,
}: ListingsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [ready, setReady] = useState(false);

  const pins: Pin[] = [
    ...listings.map((l) => ({
      id: l.id,
      lat: l.approxPin.lat,
      lng: l.approxPin.lng,
      label: l.title,
      sublabel: `${l.neighborhood} · ${formatKes(l.priceKes)}`,
      type: "listing" as const,
    })),
    ...stations.map((s) => ({
      id: s.id,
      lat: s.pin.lat,
      lng: s.pin.lng,
      label: s.name,
      sublabel: s.code,
      type: "station" as const,
    })),
  ];

  if (userLocation) {
    pins.push({
      id: "user",
      lat: userLocation.lat,
      lng: userLocation.lng,
      label: "You",
      type: "user",
    });
  }

  useEffect(() => {
    if (!mapContainer.current || !hasMapboxToken()) return;

    mapboxgl.accessToken = getMapboxToken();
    const mapCenter = center ?? userLocation ?? KISUMU_CENTER;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [mapCenter.lng, mapCenter.lat],
      zoom: 12,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), "top-right");
    mapRef.current = map;
    map.on("load", () => setReady(true));

    return () => {
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const pin of pins) {
      const el = document.createElement("button");
      el.className = cn(
        "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform hover:scale-110",
        pin.type === "listing" && "bg-primary text-primary-foreground",
        pin.type === "station" && "bg-emerald-600 text-white",
        pin.type === "user" && "bg-blue-600 text-white h-4 w-4",
      );
      el.title = pin.label;
      el.type = "button";

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([pin.lng, pin.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 16 }).setHTML(
            `<div class="p-1"><strong>${pin.label}</strong>${pin.sublabel ? `<br/><span style="font-size:12px;opacity:.7">${pin.sublabel}</span>` : ""}</div>`,
          ),
        )
        .addTo(map);

      if (pin.type !== "user" && onPinClick) {
        el.addEventListener("click", () => onPinClick(pin.id, pin.type as "listing" | "station"));
      }

      markersRef.current.push(marker);
    }

    if (center) {
      map.flyTo({ center: [center.lng, center.lat], zoom: 13 });
    }
  }, [pins, ready, center, onPinClick]);

  if (!hasMapboxToken()) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 p-8 text-center",
          className,
        )}
      >
        <Badge variant="warning">Mapbox token missing</Badge>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">
          Add <code className="text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> to your{" "}
          <code className="text-xs">.env</code> to enable the live map.
        </p>
      </div>
    );
  }

  return <div ref={mapContainer} className={cn("h-full min-h-[360px] w-full rounded-xl", className)} />;
}
