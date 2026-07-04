import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { updateUserProfile, toUserDto } from "@/lib/auth/service";
import { getUserActivityCounts, toUserProfileDto, userProfileSelect } from "@/lib/users/profile";

const patchSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  email: z.string().email().max(120).optional().nullable(),
  county: z.string().max(40).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const { user } = await requireAuth(request);
    const profile = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: userProfileSelect,
    });
    const stats = await getUserActivityCounts(user.id);
    return jsonWithCors({ user: toUserProfileDto(profile, stats) }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAuth(request);
    const body = patchSchema.parse(await request.json());
    const updated = await updateUserProfile(user.id, body);
    return jsonWithCors({ user: toUserDto(updated) }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
