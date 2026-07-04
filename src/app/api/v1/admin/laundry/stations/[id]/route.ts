import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";

const patchSchema = z.object({
  code: z.string().min(2).max(8).toUpperCase().optional(),
  name: z.string().min(2).max(120).optional(),
  address: z.string().min(3).max(200).optional(),
  county: z.string().min(2).max(40).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireRole(request, ["admin"]);
    const body = patchSchema.parse(await request.json());
    const station = await prisma.laundryStation.update({
      where: { id: params.id },
      data: body,
    });
    return jsonWithCors(
      {
        station: {
          id: station.id,
          code: station.code,
          name: station.name,
          isActive: station.isActive,
        },
      },
      request,
    );
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
