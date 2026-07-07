import type { BnbBooking } from "@prisma/client";

type BookingRow = Pick<
  BnbBooking,
  | "id"
  | "listingId"
  | "checkIn"
  | "checkOut"
  | "guests"
  | "nights"
  | "nightlyRate"
  | "cleaningFee"
  | "totalKes"
  | "status"
  | "paymentStatus"
  | "mpesaReceipt"
  | "createdAt"
  | "updatedAt"
> & {
  listing?: { id: string; title: string; neighborhood: string; county: string };
};

export function toBnbBookingDto(row: BookingRow) {
  return {
    id: row.id,
    listingId: row.listingId,
    listing: row.listing
      ? {
          id: row.listing.id,
          title: row.listing.title,
          neighborhood: row.listing.neighborhood,
          county: row.listing.county,
        }
      : undefined,
    checkIn: row.checkIn.toISOString().slice(0, 10),
    checkOut: row.checkOut.toISOString().slice(0, 10),
    guests: row.guests,
    nights: row.nights,
    nightlyRate: row.nightlyRate,
    cleaningFee: row.cleaningFee,
    totalKes: row.totalKes,
    status: row.status,
    paymentStatus: row.paymentStatus,
    mpesaReceipt: row.mpesaReceipt,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    confirmed: row.status === "confirmed" && row.paymentStatus === "success",
  };
}
