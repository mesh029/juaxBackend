import type { AdminListing } from "@/lib/api/types";

export const KISUMU_DEFAULT = {
  approxLat: -0.0917,
  approxLng: 34.768,
  exactLat: -0.09,
  exactLng: 34.77,
};

export type ListingFormState = {
  type: string;
  title: string;
  description: string;
  neighborhood: string;
  county: string;
  beds: string;
  baths: string;
  sqm: string;
  furnished: boolean;
  vacant: boolean;
  priceKes: string;
  priceUnit: string;
  cleaningFeeKes: string;
  exactAddress: string;
  approxLat: number;
  approxLng: number;
  exactLat: number;
  exactLng: number;
  hostName: string;
  hostPhone: string;
  hostWhatsapp: string;
  publish: boolean;
  amenities: string[];
  coverImageUrl: string;
  galleryUrlsText: string;
};

export const INITIAL_LISTING_FORM: ListingFormState = {
  type: "rental",
  title: "",
  description: "",
  neighborhood: "Nyamasaria",
  county: "kisumu",
  beds: "2",
  baths: "1",
  sqm: "",
  furnished: false,
  vacant: true,
  priceKes: "22000",
  priceUnit: "month",
  cleaningFeeKes: "0",
  exactAddress: "",
  hostName: "",
  hostPhone: "",
  hostWhatsapp: "",
  publish: true,
  amenities: [],
  coverImageUrl: "",
  galleryUrlsText: "",
  ...KISUMU_DEFAULT,
};

export function listingToForm(listing: AdminListing): ListingFormState {
  return {
    type: listing.type,
    title: listing.title,
    description: listing.description ?? "",
    neighborhood: listing.neighborhood,
    county: listing.county,
    beds: String(listing.beds),
    baths: String(listing.baths),
    sqm: listing.sqm != null ? String(listing.sqm) : "",
    furnished: listing.furnished,
    vacant: listing.vacant,
    priceKes: String(listing.priceKes),
    priceUnit: listing.priceUnit,
    cleaningFeeKes: String(listing.cleaningFeeKes),
    exactAddress: listing.exactAddress ?? "",
    approxLat: listing.approxPin.lat,
    approxLng: listing.approxPin.lng,
    exactLat: listing.exactPin.lat,
    exactLng: listing.exactPin.lng,
    hostName: listing.hostName ?? "",
    hostPhone: listing.hostPhone ?? "",
    hostWhatsapp: listing.hostWhatsapp ?? "",
    publish: listing.status === "published",
    amenities: listing.amenities ?? [],
    coverImageUrl: listing.coverImageUrl ?? "",
    galleryUrlsText: (listing.imageUrls ?? [])
      .filter((u) => u !== listing.coverImageUrl)
      .join("\n"),
  };
}

export function parseGalleryUrls(text: string): string[] {
  return [...new Set(text.split("\n").map((l) => l.trim()).filter(Boolean))];
}

export function formToPayload(form: ListingFormState) {
  const gallery = parseGalleryUrls(form.galleryUrlsText);
  const cover = form.coverImageUrl.trim() || gallery[0] || undefined;
  const imageUrls = cover
    ? [cover, ...gallery.filter((u) => u !== cover)]
    : gallery;

  return {
    type: form.type,
    title: form.title,
    description: form.description || undefined,
    neighborhood: form.neighborhood,
    county: form.county,
    beds: Number(form.beds),
    baths: Number(form.baths),
    sqm: form.sqm ? Number(form.sqm) : undefined,
    furnished: form.furnished,
    vacant: form.vacant,
    priceKes: Number(form.priceKes),
    priceUnit: form.priceUnit,
    cleaningFeeKes: Number(form.cleaningFeeKes),
    approxLat: form.approxLat,
    approxLng: form.approxLng,
    exactAddress: form.exactAddress,
    exactLat: form.exactLat,
    exactLng: form.exactLng,
    hostName: form.hostName,
    hostPhone: form.hostPhone,
    hostWhatsapp: form.hostWhatsapp || undefined,
    amenities: form.amenities,
    coverImageUrl: cover,
    imageUrls,
    publish: form.publish,
  };
}

/** Client-side validation before API call */
export function validateListingForm(form: ListingFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.title.trim().length < 3) errors.title = "Title must be at least 3 characters";
  if (form.neighborhood.trim().length < 2) errors.neighborhood = "Location name is too short";
  if (form.exactAddress.trim().length < 3) errors.exactAddress = "Address must be at least 3 characters";
  if (form.hostName.trim().length < 2) errors.hostName = "Host name is too short";
  if (form.hostPhone.trim().length < 10) errors.hostPhone = "Enter a valid phone number";
  const price = Number(form.priceKes);
  if (!Number.isFinite(price) || price <= 0) errors.priceKes = "Enter a valid price";
  return errors;
}
