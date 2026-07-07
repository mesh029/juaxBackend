"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Crosshair, MapPin, Navigation } from "lucide-react";
import { getCurrentPosition, getMapboxToken, hasMapboxToken, isInKenya, KISUMU_CENTER } from "@/lib/mapbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Coords = { lat: number; lng: number };

type PickMode = "exact" | "approx" | null;

type CoordinatePickerProps = {
  exact: Coords;
  approx: Coords;
  onExactChange: (c: Coords) => void;
  onApproxChange: (c: Coords) => void;
  className?: string;
};

export function CoordinatePicker({
  exact,
  approx,
  onExactChange,
  onApproxChange,
  className,
}: CoordinatePickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const exactMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const approxMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const mapReadyRef = useRef(false);
  const pendingFlyRef = useRef<Coords | null>(null);
  const onExactRef = useRef(onExactChange);
  const onApproxRef = useRef(onApproxChange);
  const [pickMode, setPickMode] = useState<PickMode>(null);
  const pickModeRef = useRef<PickMode>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoHint, setGeoHint] = useState<string | null>(null);

  onExactRef.current = onExactChange;
  onApproxRef.current = onApproxChange;

  const flyTo = useCallback((c: Coords) => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) {
      pendingFlyRef.current = c;
      return;
    }
    pendingFlyRef.current = null;
    map.flyTo({ center: [c.lng, c.lat], zoom: 17, essential: true });
  }, []);

  const placeExact = useCallback(
    (c: Coords, fly = true) => {
      exactMarkerRef.current?.setLngLat([c.lng, c.lat]);
      onExactRef.current(c);
      if (fly) flyTo(c);
    },
    [flyTo],
  );

  useEffect(() => {
    if (!mapContainer.current || !hasMapboxToken()) return;

    mapboxgl.accessToken = getMapboxToken();
    const start = {
      lat: exact.lat || KISUMU_CENTER.lat,
      lng: exact.lng || KISUMU_CENTER.lng,
    };

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [start.lng, start.lat],
      zoom: 14,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), "top-right");
    mapRef.current = map;

    const exactEl = document.createElement("div");
    exactEl.className =
      "h-4 w-4 rounded-full border-2 border-white bg-red-500 shadow-md cursor-pointer";
    exactMarkerRef.current = new mapboxgl.Marker({ element: exactEl, draggable: true })
      .setLngLat([exact.lng, exact.lat])
      .addTo(map);
    exactMarkerRef.current.on("dragend", () => {
      const ll = exactMarkerRef.current!.getLngLat();
      onExactRef.current({ lat: ll.lat, lng: ll.lng });
    });

    const approxEl = document.createElement("div");
    approxEl.className =
      "h-4 w-4 rounded-full border-2 border-white bg-amber-500 shadow-md cursor-pointer";
    approxMarkerRef.current = new mapboxgl.Marker({ element: approxEl, draggable: true })
      .setLngLat([approx.lng, approx.lat])
      .addTo(map);
    approxMarkerRef.current.on("dragend", () => {
      const ll = approxMarkerRef.current!.getLngLat();
      onApproxRef.current({ lat: ll.lat, lng: ll.lng });
    });

    map.on("load", () => {
      mapReadyRef.current = true;
      if (pendingFlyRef.current) flyTo(pendingFlyRef.current);
    });

    map.on("click", (e) => {
      const mode = pickModeRef.current;
      const c = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      if (mode === "exact") placeExact(c, false);
      else if (mode === "approx") {
        approxMarkerRef.current?.setLngLat([c.lng, c.lat]);
        onApproxRef.current(c);
      }
    });

    return () => {
      mapReadyRef.current = false;
      exactMarkerRef.current?.remove();
      approxMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, [placeExact]);

  useEffect(() => {
    exactMarkerRef.current?.setLngLat([exact.lng, exact.lat]);
  }, [exact.lat, exact.lng]);

  useEffect(() => {
    approxMarkerRef.current?.setLngLat([approx.lng, approx.lat]);
  }, [approx.lat, approx.lng]);

  async function useMyLocation() {
    setGeoLoading(true);
    setGeoError(null);
    setGeoHint(null);
    try {
      const pos = await getCurrentPosition();
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const accuracy = pos.coords.accuracy;

      if (accuracy > 3000) {
        setGeoError(
          `Low GPS accuracy (±${Math.round(accuracy)}m) — map may show a rough network estimate. Move outdoors or drag the pin to correct.`,
        );
      } else if (!isInKenya(c.lat, c.lng)) {
        setGeoError(
          `Location looks outside Kenya (${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}). Drag the pin if this is wrong.`,
        );
      } else {
        setGeoHint(`GPS: ${c.lat.toFixed(5)}, ${c.lng.toFixed(5)} (±${Math.round(accuracy)}m)`);
      }

      placeExact(c, true);
      approxMarkerRef.current?.setLngLat([c.lng, c.lat]);
      onApproxRef.current(c);
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : "Could not get your location");
    } finally {
      setGeoLoading(false);
    }
  }

  function setMode(mode: PickMode) {
    pickModeRef.current = mode;
    setPickMode(mode);
  }

  if (!hasMapboxToken()) {
    return (
      <p className="text-sm text-muted-foreground">
        Add <code className="text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the map picker.
        You can still enter coordinates manually below.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3 sm:col-span-2", className)}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={pickMode === "exact" ? "default" : "outline"}
          onClick={() => setMode(pickMode === "exact" ? null : "exact")}
        >
          <MapPin className="mr-1 h-3 w-3" />
          {pickMode === "exact" ? "Click map… (exact)" : "Set exact on map"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={pickMode === "approx" ? "default" : "outline"}
          onClick={() => setMode(pickMode === "approx" ? null : "approx")}
        >
          <Crosshair className="mr-1 h-3 w-3" />
          {pickMode === "approx" ? "Click map… (approx)" : "Set approx pin on map"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={useMyLocation} disabled={geoLoading}>
          <Navigation className="mr-1 h-3 w-3" />
          {geoLoading ? "Getting GPS…" : "Use my location (exact)"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Allow location when prompted. We wait for GPS (not network estimate) — may take a few seconds outdoors.
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline" className="gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          Exact {exact.lat.toFixed(5)}, {exact.lng.toFixed(5)}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          Approx {approx.lat.toFixed(5)}, {approx.lng.toFixed(5)}
        </Badge>
      </div>
      {geoHint && <p className="text-xs text-muted-foreground">{geoHint}</p>}
      {geoError && <p className="text-sm text-destructive">{geoError}</p>}
      <div
        ref={mapContainer}
        className="h-[280px] w-full overflow-hidden rounded-lg border border-border"
      />
      <p className="text-xs text-muted-foreground">
        Drag pins or click the map after choosing a mode. Red = exact (gated). Amber = public map pin —{" "}
        <strong>the mobile app uses amber only</strong> for map, distance, and Near me. Moving red also updates
        amber; drag amber separately if you need a privacy offset.
      </p>
    </div>
  );
}
