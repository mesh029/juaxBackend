import { prisma } from "@/lib/db";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export async function GET(request: Request) {
  const stations = await prisma.laundryStation.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      address: true,
      county: true,
      lat: true,
      lng: true,
    },
  });

  return jsonWithCors(
    stations.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      address: s.address,
      county: s.county,
      pin: { lat: s.lat, lng: s.lng },
    })),
    request,
  );
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
