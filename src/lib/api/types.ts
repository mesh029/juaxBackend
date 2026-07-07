export type ApiUser = {
  id: string;
  phone: string;
  displayName: string | null;
  email?: string | null;
  county?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  role: "user" | "agent" | "admin";
  signedUpAt?: string;
  lastLoginAt?: string | null;
};

export type PublicListing = {
  id: string;
  type: "bnb" | "rental";
  title: string;
  description: string | null;
  neighborhood: string;
  locationName: string;
  county: string;
  beds: number;
  baths: number;
  sqm?: number | null;
  furnished?: boolean;
  priceKes: number;
  priceUnit: string;
  approxPin: { lat: number; lng: number };
  coordinates?: {
    approx: { lat: number; lng: number };
    exact?: { lat: number; lng: number };
  };
  locationLocked: boolean;
  vacant: boolean;
  distanceKm?: number;
  amenities: string[];
  coverImageUrl?: string | null;
  imageUrls?: string[];
  exactAddress?: string;
  exactPin?: { lat: number; lng: number };
  hostName?: string;
  hostPhone?: string;
  hostWhatsapp?: string | null;
};

export type NearbyResponse = {
  radiusKm: number;
  center: { lat: number; lng: number };
  listings: PublicListing[];
};

export type LaundryStation = {
  id: string;
  code: string;
  name: string;
  address: string;
  county: string;
  pin: { lat: number; lng: number };
  isActive?: boolean;
};

export type ServicesResponse = {
  rides: { enabled: boolean; label: string };
  sakaKeja: { enabled: boolean };
  fua: { enabled: boolean };
};

export type SubscriptionPlan = {
  plan: string;
  priceKes: number;
  durationHours: number;
  label: string;
};

export type AdminUser = {
  id: string;
  phone: string;
  displayName: string | null;
  email?: string | null;
  county?: string | null;
  role: string;
  isActive: boolean;
  signedUpAt?: string;
  lastLoginAt?: string | null;
  createdAt: string;
};

export type ServiceFeedback = {
  id: string;
  service: string;
  category: string;
  rating: number | null;
  title: string | null;
  body: string;
  orderId: string | null;
  listingId: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; phone: string; displayName: string | null } | null;
  listing?: { id: string; title: string; neighborhood: string; type: string } | null;
};

export type UserProfile = ApiUser & {
  stats?: { laundryOrders: number; bnbBookings: number; feedback: number };
};

export type AdminListing = {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string | null;
  neighborhood: string;
  locationName: string;
  county: string;
  priceKes: number;
  priceUnit: string;
  cleaningFeeKes: number;
  coverImageUrl: string | null;
  imageUrls: string[];
  beds: number;
  baths: number;
  sqm: number | null;
  furnished: boolean;
  amenities: string[];
  vacant: boolean;
  approxPin: { lat: number; lng: number };
  exactPin: { lat: number; lng: number };
  exactAddress: string | null;
  hostName: string | null;
  hostPhone: string | null;
  hostWhatsapp: string | null;
  createdAt: string;
};

export type LaundryOrder = {
  id: string;
  pickupMode: string;
  serviceType?: "laundry" | "mamafua";
  pickupLabel: string;
  loadLabel: string;
  loadKg: number;
  tasks?: string[];
  taskLabels?: string[];
  tasksFeeKes?: number;
  dispatchFeeKes?: number;
  totalKes: number;
  status: string;
  scheduleDate: string;
  scheduleBand: string;
  steps: string[];
  currentStep: number;
  tracking?: LaundryTrackingEvent[];
  customer?: { phone: string; displayName: string | null };
  adminNotes?: string | null;
  customerConfirmedAt?: string | null;
  createdAt: string;
};

export type LaundryTrackingEvent = {
  id: string;
  kind: string;
  label: string;
  description?: string;
  actorRole: string;
  note: string | null;
  createdAt: string;
  createdBy?: { name: string | null; phone: string; role: string } | null;
};

export type HealthResponse = {
  status: string;
  db: string;
};

export type MamaFuaConvenienceBand = {
  id: "asap" | "morning" | "afternoon" | "evening";
  label: string;
  shortLabel: string;
  description: string;
  timeWindow: string | null;
};

export type AppCatalogBootstrap = {
  county: string;
  kisumuOnly: boolean;
  listings: {
    rental: PublicListing[];
    bnb: PublicListing[];
  };
  laundryStations: LaundryStation[];
  mamaFua: {
    dispatchFeeKes: number;
    description: string;
    tasks: { id: string; label: string; description: string; priceKes: number; acceptsLoadKg: boolean }[];
    convenienceTimes?: MamaFuaConvenienceBand[];
  };
  subscriptionPlans: SubscriptionPlan[];
};
