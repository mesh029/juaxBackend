import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";

const stationSchema = z.object({
  code: z.string().min(2).max(8).toUpperCase(),
  name: z.string().min(2).max(120),
  address: z.string().min(3).max(200),
  county: z.string().min(2).max(40),
  lat: z.number(),
  lng: z.number(),
  isActive: z.boolean().default(true),
});

function toStationDto(s: {
  id: string;
  code: string;
  name: string;
  address: string;
  county: string;
  lat: number;
  lng: number;
  isActive: boolean;
}) {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    address: s.address,
    county: s.county,
    lat: s.lat,
    lng: s.lng,
    pin: { lat: s.lat, lng: s.lng },
    isActive: s.isActive,
  };
}

export async function GET(request: Request) {
  try {
    await requireRole(request, ["admin"]);
    const stations = await prisma.laundryStation.findMany({
      orderBy: { name: "asc" },
    });
    return jsonWithCors({ stations: stations.map(toStationDto) }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["admin"]);
    const body = stationSchema.parse(await request.json());
    const station = await prisma.laundryStation.create({ data: body });
    return jsonWithCors({ station: toStationDto(station) }, request, { status: 201 });
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
