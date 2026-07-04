/** Earth radius in kilometres (WGS-84 mean). */
const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two WGS-84 points. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * SQL expression for haversine distance (km) from ($lat, $lng) to listing approx pin.
 * Param indices: lat = $latIdx, lng = $lngIdx (column names approx_lat / approx_lng).
 */
export function haversineSqlKm(latIdx: number, lngIdx: number): string {
  return `(
    ${EARTH_RADIUS_KM} * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians($${latIdx})) * cos(radians(approx_lat))
        * cos(radians(approx_lng) - radians($${lngIdx}))
        + sin(radians($${latIdx})) * sin(radians(approx_lat))
      ))
    )
  )`;
}
