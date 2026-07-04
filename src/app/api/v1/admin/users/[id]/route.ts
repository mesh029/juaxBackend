import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getUserActivityCounts, toUserProfileDto, userProfileSelect } from "@/lib/users/profile";

type Params = { params: { id: string } };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireRole(request, ["admin"]);
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: userProfileSelect,
    });
    if (!user) {
      return jsonWithCors({ error: "not_found", message: "User not found" }, request, {
        status: 404,
      });
    }
    const stats = await getUserActivityCounts(user.id);
    return jsonWithCors({ user: toUserProfileDto(user, stats) }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
