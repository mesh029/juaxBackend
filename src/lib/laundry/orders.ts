import { prisma } from "@/lib/db";
import { computeOrderPricing } from "@/lib/laundry/pricing";
import { normalizeMamaFuaTasks } from "@/lib/laundry/mamafua-tasks";
import { logLaundryTrackingEvent, trackingInclude } from "@/lib/laundry/tracking";
import type { LaundryOrderBody } from "@/lib/laundry/schemas";

const orderInclude = {
  station: { select: { name: true, code: true, address: true } },
  user: { select: { phoneE164: true, displayName: true } },
  ...trackingInclude,
} as const;

export async function createLaundryOrder(userId: string, body: LaundryOrderBody) {
  if (body.pickupMode === "station" && body.stationId) {
    const station = await prisma.laundryStation.findFirst({
      where: { id: body.stationId, isActive: true },
    });
    if (!station) throw new Error("invalid_station");
  }

  const isMamafua = body.pickupMode === "mamafua";
  const tasks = isMamafua ? normalizeMamaFuaTasks(body.tasks) : [];
  const hasLaundryTask = tasks.includes("laundry");
  const effectiveLoadKg = isMamafua
    ? hasLaundryTask
      ? body.loadKg
      : 0
    : body.loadKg;

  const pricing = computeOrderPricing({
    pickupMode: body.pickupMode,
    loadKg: effectiveLoadKg,
    tasks,
  });

  const order = await prisma.$transaction(
    async (tx) => {
    const created = await tx.laundryOrder.create({
      data: {
        userId,
        pickupMode: body.pickupMode,
        stationId: body.pickupMode === "station" ? body.stationId : null,
        pickupAddress:
          body.pickupMode === "door" || body.pickupMode === "mamafua"
            ? body.pickupAddress
            : null,
        pickupLat: body.pickupLat,
        pickupLng: body.pickupLng,
        pickupCounty: body.pickupCounty,
        loadKg: effectiveLoadKg,
        loadItems: body.loadItems,
        tasks,
        tasksFeeKes: pricing.tasksFeeKes,
        scheduleDate: new Date(body.scheduleDate),
        scheduleBand: body.scheduleBand,
        ratePerKg: pricing.ratePerKg,
        pickupFeeKes: pricing.pickupFeeKes,
        totalKes: pricing.totalKes,
        adminNotes: body.notes,
      },
      include: orderInclude,
    });

    await tx.laundryStatusEvent.create({
      data: {
        orderId: created.id,
        status: "requested",
        note: body.notes,
        createdBy: userId,
      },
    });

    await tx.laundryTrackingEvent.create({
      data: {
        orderId: created.id,
        kind: "order_placed",
        actorRole: "customer",
        createdBy: userId,
        note: body.notes,
      },
    });

    return created;
  },
    { timeout: 20_000 },
  );

  return prisma.laundryOrder.findUniqueOrThrow({
    where: { id: order.id },
    include: orderInclude,
  });
}

export async function getUserLaundryOrders(userId: string) {
  return prisma.laundryOrder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: orderInclude,
  });
}

export async function getLaundryOrderForUser(userId: string, orderId: string) {
  return prisma.laundryOrder.findFirst({
    where: { id: orderId, userId },
    include: orderInclude,
  });
}

export async function getAdminLaundryOrders(status?: string) {
  return prisma.laundryOrder.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    include: orderInclude,
    take: 100,
  });
}

export async function getLaundryOrderById(orderId: string) {
  return prisma.laundryOrder.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });
}

export { orderInclude };
