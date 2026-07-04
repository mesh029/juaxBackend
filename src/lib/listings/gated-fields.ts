import { prisma } from "@/lib/db";
import type { ListingGatedFields } from "@/lib/location-gate";

export async function fetchGatedFields(
  listingId: string,
): Promise<ListingGatedFields | null> {
  const row = await prisma.listing.findFirst({
    where: { id: listingId, status: "published" },
    select: {
      exactAddress: true,
      exactLat: true,
      exactLng: true,
      hostName: true,
      hostPhone: true,
      hostWhatsapp: true,
    },
  });

  if (!row) return null;

  return {
    exact_address: row.exactAddress,
    exact_lat: row.exactLat,
    exact_lng: row.exactLng,
    host_name: row.hostName,
    host_phone: row.hostPhone,
    host_whatsapp: row.hostWhatsapp,
  };
}
