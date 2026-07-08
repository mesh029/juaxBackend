/**
 * Import Kenya county polygons into admin_areas (PostGIS).
 * Usage: node scripts/import-kenya-counties.mjs [--all | --pilot]
 * Default: pilot counties (kisumu, nyamira, nairobi, mombasa)
 */
import "dotenv/config";
import pg from "pg";

const PILOT_SLUGS = ["kisumu", "nyamira", "nairobi", "mombasa"];
const COUNTIES_META_URL =
  "https://raw.githubusercontent.com/Mondieki/kenya-counties-subcounties/master/counties.json";
const GEOJSON_BASE =
  "https://raw.githubusercontent.com/Mondieki/kenya-counties-subcounties/master/geojson";

const mode = process.argv.includes("--all") ? "all" : "pilot";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url.replace(/[?&]sslmode=[^&]+/, "").replace(/\?$/, ""),
  ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : false,
});

function slugify(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

function geojsonToWktMultipolygon(geojson) {
  const polys = [];
  const collect = (geom) => {
    if (!geom) return;
    if (geom.type === "Polygon") {
      polys.push(geom.coordinates);
    } else if (geom.type === "MultiPolygon") {
      for (const p of geom.coordinates) polys.push(p);
    } else if (geom.type === "GeometryCollection") {
      for (const g of geom.geometries ?? []) collect(g);
    }
  };
  collect(geojson);
  if (!polys.length) throw new Error("no polygon geometry found");

  const ringToWkt = (ring) =>
    `(${ring.map(([lng, lat]) => `${lng} ${lat}`).join(", ")})`;
  const polyToWkt = (poly) => `(${poly.map(ringToWkt).join(", ")})`;
  return `MULTIPOLYGON (${polys.map(polyToWkt).join(", ")})`;
}

async function importCounty(client, meta) {
  const slug = slugify(meta.name);
  if (mode === "pilot" && !PILOT_SLUGS.includes(slug)) return false;

  const res = await fetch(`${GEOJSON_BASE}/${slug}.json`);
  if (!res.ok) {
    console.warn(`  skip ${slug}: geojson ${res.status}`);
    return false;
  }
  const geojson = await res.json();
  const wkt = geojsonToWktMultipolygon(geojson);

  await client.query(
    `INSERT INTO admin_areas (country_code, level, slug, name, code, boundary, center)
     VALUES (
       'KE', 'county', $1, $2, $3,
       ST_GeogFromText($4),
       ST_Centroid(ST_GeogFromText($4)::geometry)::geography
     )
     ON CONFLICT (country_code, level, slug) DO UPDATE SET
       name = EXCLUDED.name,
       code = EXCLUDED.code,
       boundary = EXCLUDED.boundary,
       center = EXCLUDED.center`,
    [slug, meta.name, meta.code ?? null, wkt],
  );
  console.log(`  ✓ ${meta.name} (${slug})`);
  return true;
}

async function backfillListingCounties(client) {
  const { rowCount } = await client.query(`
    UPDATE listings l
    SET county = a.slug
    FROM admin_areas a
    WHERE a.country_code = 'KE'
      AND a.level = 'county'
      AND ST_Contains(
        a.boundary::geometry,
        ST_SetSRID(ST_MakePoint(l.approx_lng, l.approx_lat), 4326)
      )
      AND lower(l.county) IS DISTINCT FROM a.slug
  `);
  console.log(`\nBackfilled listing counties: ${rowCount ?? 0} rows`);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS postgis");
    const metaRes = await fetch(COUNTIES_META_URL);
    if (!metaRes.ok) throw new Error(`counties.json ${metaRes.status}`);
    const counties = await metaRes.json();
    console.log(`Importing Kenya counties (${mode})…\n`);

    let imported = 0;
    for (const meta of counties) {
      if (await importCounty(client, meta)) imported += 1;
    }
    console.log(`\nImported ${imported} counties`);
    await backfillListingCounties(client);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
