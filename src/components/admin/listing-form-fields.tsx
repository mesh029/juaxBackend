"use client";

import { Copy } from "lucide-react";
import { LISTING_AMENITY_OPTIONS } from "@/lib/listings/amenities";
import { PILOT_COUNTIES } from "@/lib/listings/counties";
import type { ListingFormState } from "@/lib/listings/listing-form-state";
import { CoordinatePicker } from "@/components/map/coordinate-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="sm:col-span-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function BoolField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input accent-primary"
      />
      {label}
    </label>
  );
}

type ListingFormFieldsProps = {
  form: ListingFormState;
  setForm: React.Dispatch<React.SetStateAction<ListingFormState>>;
  fieldErrors: Record<string, string>;
  showPublish?: boolean;
};

export function ListingFormFields({
  form,
  setForm,
  fieldErrors,
  showPublish = true,
}: ListingFormFieldsProps) {
  function toggleAmenity(amenity: string) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(amenity)
        ? f.amenities.filter((a) => a !== amenity)
        : [...f.amenities, amenity],
    }));
  }

  function copyExactToApprox() {
    setForm((f) => ({ ...f, approxLat: f.exactLat, approxLng: f.exactLng }));
  }

  const inputClass = (field: string) =>
    cn(fieldErrors[field] && "border-destructive focus-visible:ring-destructive");

  return (
    <>
      <SectionHeading title="Basics" />
      <div className="space-y-2">
        <Label>Type</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={form.type}
          onChange={(e) =>
            setForm({
              ...form,
              type: e.target.value,
              priceUnit: e.target.value === "bnb" ? "night" : "month",
              vacant: e.target.value === "rental",
            })
          }
        >
          <option value="rental">Rental</option>
          <option value="bnb">BnB</option>
        </select>
      </div>
      {showPublish && (
        <div className="space-y-2">
          <Label>Publish immediately</Label>
          <BoolField
            label="Published (visible on public API)"
            checked={form.publish}
            onChange={(publish) => setForm({ ...form, publish })}
          />
        </div>
      )}
      <div className="space-y-2 sm:col-span-2">
        <Label>Title</Label>
        <Input
          className={inputClass("title")}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <FieldError message={fieldErrors.title} />
      </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Description</Label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Short description for browse cards…"
                    />
                  </div>

                  <Separator className="sm:col-span-2" />
                  <SectionHeading
                    title="Photos"
                    description="Paste public image URLs (Cloudinary, S3, etc.). First image is the cover card."
                  />
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Cover image URL</Label>
                    <Input
                      className={inputClass("coverImageUrl")}
                      value={form.coverImageUrl}
                      onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
                      placeholder="https://…/cover.jpg"
                    />
                    <FieldError message={fieldErrors.coverImageUrl} />
                    {form.coverImageUrl.trim() && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.coverImageUrl.trim()}
                        alt="Cover preview"
                        className="mt-2 h-32 w-full max-w-xs rounded-md border object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Gallery URLs (one per line)</Label>
                    <textarea
                      className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs"
                      value={form.galleryUrlsText}
                      onChange={(e) => setForm({ ...form, galleryUrlsText: e.target.value })}
                      placeholder={"https://…/photo1.jpg\nhttps://…/photo2.jpg"}
                    />
                  </div>

                  <Separator className="sm:col-span-2" />
                  <SectionHeading
        title="Location"
        description="Location name is the public area label (e.g. Nyamasaria, Milimani)"
      />
      <div className="space-y-2">
        <Label>Location name</Label>
        <Input
          className={inputClass("neighborhood")}
          value={form.neighborhood}
          onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
          required
        />
        <FieldError message={fieldErrors.neighborhood} />
      </div>
      <div className="space-y-2">
        <Label>County</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm capitalize"
          value={form.county}
          onChange={(e) => setForm({ ...form, county: e.target.value })}
        >
          {PILOT_COUNTIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Exact address (gated until unlock)</Label>
        <Input
          className={inputClass("exactAddress")}
          value={form.exactAddress}
          onChange={(e) => setForm({ ...form, exactAddress: e.target.value })}
          placeholder="e.g. Plot 12, Ring Road, Nyamasaria"
          required
        />
        <FieldError message={fieldErrors.exactAddress} />
      </div>

      <CoordinatePicker
        exact={{ lat: form.exactLat, lng: form.exactLng }}
        approx={{ lat: form.approxLat, lng: form.approxLng }}
        onExactChange={(c) => setForm({ ...form, exactLat: c.lat, exactLng: c.lng })}
        onApproxChange={(c) => setForm({ ...form, approxLat: c.lat, approxLng: c.lng })}
      />

      <div className="space-y-2">
        <Label>Exact latitude</Label>
        <Input
          type="number"
          step="any"
          className={inputClass("exactLat")}
          value={form.exactLat}
          onChange={(e) => setForm({ ...form, exactLat: Number(e.target.value) })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Exact longitude</Label>
        <Input
          type="number"
          step="any"
          className={inputClass("exactLng")}
          value={form.exactLng}
          onChange={(e) => setForm({ ...form, exactLng: Number(e.target.value) })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Approx latitude (public map pin)</Label>
        <Input
          type="number"
          step="any"
          value={form.approxLat}
          onChange={(e) => setForm({ ...form, approxLat: Number(e.target.value) })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Approx longitude (public map pin)</Label>
        <Input
          type="number"
          step="any"
          value={form.approxLng}
          onChange={(e) => setForm({ ...form, approxLng: Number(e.target.value) })}
          required
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="button" variant="outline" size="sm" onClick={copyExactToApprox}>
          <Copy className="mr-2 h-3 w-3" />
          Copy exact coords → approx pin
        </Button>
      </div>

      <Separator className="sm:col-span-2" />
      <SectionHeading title="Property details" />
      <div className="space-y-2">
        <Label>Beds</Label>
        <Input
          type="number"
          min={0}
          value={form.beds}
          onChange={(e) => setForm({ ...form, beds: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Baths</Label>
        <Input
          type="number"
          min={0}
          value={form.baths}
          onChange={(e) => setForm({ ...form, baths: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Size (sqm)</Label>
        <Input
          type="number"
          min={1}
          value={form.sqm}
          onChange={(e) => setForm({ ...form, sqm: e.target.value })}
          placeholder="Optional"
        />
      </div>
      <div className="space-y-2">
        <Label>Price (KES)</Label>
        <Input
          className={inputClass("priceKes")}
          value={form.priceKes}
          onChange={(e) => setForm({ ...form, priceKes: e.target.value })}
          required
        />
        <FieldError message={fieldErrors.priceKes} />
      </div>
      <div className="space-y-2">
        <Label>Price unit</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={form.priceUnit}
          onChange={(e) => setForm({ ...form, priceUnit: e.target.value })}
        >
          <option value="month">Per month</option>
          <option value="night">Per night</option>
        </select>
      </div>
      {form.type === "bnb" && (
        <div className="space-y-2">
          <Label>Cleaning fee (KES)</Label>
          <Input
            value={form.cleaningFeeKes}
            onChange={(e) => setForm({ ...form, cleaningFeeKes: e.target.value })}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-4 sm:col-span-2">
        <BoolField
          label="Furnished"
          checked={form.furnished}
          onChange={(furnished) => setForm({ ...form, furnished })}
        />
        {form.type === "rental" && (
          <BoolField
            label="Vacant (available now)"
            checked={form.vacant}
            onChange={(vacant) => setForm({ ...form, vacant })}
          />
        )}
      </div>

      <Separator className="sm:col-span-2" />
      <SectionHeading title="Amenities" description="Shown on listing cards and detail" />
      <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-3 md:grid-cols-4">
        {LISTING_AMENITY_OPTIONS.map((amenity) => (
          <label
            key={amenity}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/50"
          >
            <input
              type="checkbox"
              checked={form.amenities.includes(amenity)}
              onChange={() => toggleAmenity(amenity)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            {amenity}
          </label>
        ))}
      </div>

      <Separator className="sm:col-span-2" />
      <SectionHeading title="Host contact" description="Gated until unlock" />
      <div className="space-y-2">
        <Label>Host name</Label>
        <Input
          className={inputClass("hostName")}
          value={form.hostName}
          onChange={(e) => setForm({ ...form, hostName: e.target.value })}
          required
        />
        <FieldError message={fieldErrors.hostName} />
      </div>
      <div className="space-y-2">
        <Label>Host phone</Label>
        <Input
          className={inputClass("hostPhone")}
          value={form.hostPhone}
          onChange={(e) => setForm({ ...form, hostPhone: e.target.value })}
          placeholder="+2547…"
          required
        />
        <FieldError message={fieldErrors.hostPhone} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Host WhatsApp (optional)</Label>
        <Input
          value={form.hostWhatsapp}
          onChange={(e) => setForm({ ...form, hostWhatsapp: e.target.value })}
          placeholder="+2547…"
        />
      </div>
    </>
  );
}
