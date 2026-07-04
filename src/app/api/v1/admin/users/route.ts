import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toAdminUserDto, userProfileSelect } from "@/lib/users/profile";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["admin"]);
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: userProfileSelect,
    });

    return jsonWithCors({ users: users.map(toAdminUserDto) }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
