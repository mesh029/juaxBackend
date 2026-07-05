import { prisma } from "@/lib/db";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { toLaundryStationDto } from "@/lib/laundry/station-dto";

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

  return jsonWithCors(stations.map(toLaundryStationDto), request);
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
