import { prisma } from "@/lib/db";
import { isPaymentDevMode } from "@/lib/payments/dev";
import type { bnbBookingBodySchema } from "@/lib/bnb/schemas";
import type { z } from "zod";

const bookingSelect = {
  id: true,
  listingId: true,
  checkIn: true,
  checkOut: true,
  guests: true,
  nights: true,
  nightlyRate: true,
  cleaningFee: true,
  totalKes: true,
  status: true,
  paymentStatus: true,
  mpesaReceipt: true,
  createdAt: true,
  updatedAt: true,
  listing: {
    select: { id: true, title: true, neighborhood: true, county: true },
  },
} as const;

type BookingBody = z.infer<typeof bnbBookingBodySchema>;

function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  const nights = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return Math.max(nights, 1);
}

export async function getUserBnbBookings(userId: string) {
  return prisma.bnbBooking.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: bookingSelect,
  });
}

export async function getUserBnbBooking(userId: string, bookingId: string) {
  return prisma.bnbBooking.findFirst({
    where: { id: bookingId, userId },
    select: bookingSelect,
  });
}

export async function createBnbBooking(userId: string, body: BookingBody) {
  const checkIn = new Date(`${body.checkIn}T00:00:00.000Z`);
  const checkOut = new Date(`${body.checkOut}T00:00:00.000Z`);
  if (checkOut <= checkIn) throw new Error("invalid_dates");

  const listing = await prisma.listing.findFirst({
    where: { id: body.listingId, type: "bnb", status: "published" },
    select: {
      id: true,
      priceKes: true,
      cleaningFeeKes: true,
    },
  });
  if (!listing) throw new Error("invalid_listing");

  const nights = nightsBetween(checkIn, checkOut);
  const nightlyRate = listing.priceKes;
  const cleaningFee = listing.cleaningFeeKes;
  const totalKes = nightlyRate * nights + cleaningFee;

  return prisma.bnbBooking.create({
    data: {
      userId,
      listingId: listing.id,
      checkIn,
      checkOut,
      guests: body.guests,
      nights,
      nightlyRate,
      cleaningFee,
      totalKes,
      status: "pending_payment",
      paymentStatus: "pending",
    },
    select: bookingSelect,
  });
}

export async function confirmBnbBookingPayment(
  userId: string,
  bookingId: string,
  mpesaReceipt?: string,
) {
  if (!isPaymentDevMode()) {
    throw new Error("payment_not_available");
  }

  const booking = await prisma.bnbBooking.findFirst({
    where: { id: bookingId, userId },
    select: { id: true, paymentStatus: true, status: true },
  });
  if (!booking) throw new Error("not_found");
  if (booking.paymentStatus === "success") {
    return prisma.bnbBooking.findUniqueOrThrow({
      where: { id: bookingId },
      select: bookingSelect,
    });
  }

  return prisma.bnbBooking.update({
    where: { id: bookingId },
    data: {
      paymentStatus: "success",
      status: "confirmed",
      mpesaReceipt: mpesaReceipt ?? `DEV-${Date.now()}`,
    },
    select: bookingSelect,
  });
}
