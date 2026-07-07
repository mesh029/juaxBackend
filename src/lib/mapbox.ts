const KISUMU_CENTER = { lat: -0.0917, lng: 34.768 };

export function getMapboxToken(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
}

export function hasMapboxToken(): boolean {
  return getMapboxToken().length > 10;
}

export { KISUMU_CENTER };

export type GeocodeResult = {
  lat: number;
  lng: number;
  placeName: string;
  county?: string;
};

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  const token = getMapboxToken();
  if (!token) return null;

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=locality,place,neighborhood`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return { lat, lng, placeName: "Unknown" };

  const county = feature.context?.find((c: { id: string }) => c.id.startsWith("region"))?.text;
  return {
    lat,
    lng,
    placeName: feature.place_name ?? feature.text,
    county: county?.toLowerCase(),
  };
}

export async function forwardGeocode(query: string): Promise<GeocodeResult | null> {
  const token = getMapboxToken();
  if (!token) return null;

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=ke&proximity=34.768,-0.0917&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;
  const [lng, lat] = feature.center;
  return { lat, lng, placeName: feature.place_name };
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not supported in this browser"));
      return;
    }

    let settled = false;
    let watchId: number | null = null;
    let best: GeolocationPosition | null = null;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      fn();
    };

    const tryResolve = (pos: GeolocationPosition) => {
      const { accuracy } = pos.coords;
      if (accuracy <= 80) {
        window.clearTimeout(deadline);
        finish(() => resolve(pos));
        return;
      }
      if (!best || accuracy < best.coords.accuracy) {
        best = pos;
      }
    };

    const deadline = window.setTimeout(() => {
      if (best) {
        finish(() => resolve(best!));
        return;
      }
      finish(() =>
        reject(new Error("Location timeout — enable GPS, allow permission, then try again")),
      );
    }, 18000);

    const onError = (err: GeolocationPositionError) => {
      window.clearTimeout(deadline);
      finish(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          () => reject(new Error(err.message || "Could not get your location")),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
        );
      });
    };

    watchId = navigator.geolocation.watchPosition(tryResolve, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
    });
  });
}

/** Rough Kenya bounding box — flags IP-based wrong fixes */
export function isInKenya(lat: number, lng: number): boolean {
  return lat >= -4.8 && lat <= 5.5 && lng >= 33.5 && lng <= 42.0;
}
