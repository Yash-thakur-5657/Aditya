import { useState } from "react";
import { api } from "../lib/api";
import { formatPropertyType } from "../lib/format";
import { Button } from "./ui";
import type { Property, PropertyType } from "../lib/types";

const PROPERTY_TYPES: PropertyType[] = ["apartment", "villa", "independent_house", "plot", "commercial", "pg"];

interface FormState {
  title: string;
  propertyType: PropertyType;
  city: string;
  state: string;
  locality: string;
  priceInr: string;
  bhk: string;
  areaSqft: string;
  amenities: string;
  imageUrl: string;
  listingUrl: string;
  description: string;
}

function toFormState(p: Property | null): FormState {
  return {
    title: p?.title ?? "",
    propertyType: p?.propertyType ?? "apartment",
    city: p?.city ?? "",
    state: p?.state ?? "",
    locality: p?.locality ?? "",
    priceInr: p ? String(p.priceInr) : "",
    bhk: p?.bhk ? String(p.bhk) : "",
    areaSqft: p ? String(p.areaSqft) : "",
    amenities: p?.amenities.join(", ") ?? "",
    imageUrl: p?.imageUrl ?? "",
    listingUrl: p?.listingUrl ?? "",
    description: p?.description ?? "",
  };
}

export function PropertyFormModal({
  property,
  onClose,
  onSaved,
}: {
  property: Property | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(toFormState(property));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        propertyType: form.propertyType,
        city: form.city,
        state: form.state,
        locality: form.locality,
        priceInr: Number(form.priceInr),
        bhk: form.bhk ? Number(form.bhk) : null,
        areaSqft: Number(form.areaSqft),
        amenities: form.amenities
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        imageUrl: form.imageUrl,
        listingUrl: form.listingUrl,
        description: form.description,
      };
      if (property) {
        await api.properties.update(property.id, payload);
      } else {
        await api.properties.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save property");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="border-b border-brand-100 px-6 py-4">
            <h2 className="text-base font-semibold text-brand-950">
              {property ? "Edit property" : "Add property"}
            </h2>
          </div>

          <div className="space-y-4 px-6 py-5">
            {error && <p className="text-sm text-red-600">{error}</p>}

            <Field label="Title">
              <input required value={form.title} onChange={(e) => set("title", e.target.value)} className="input" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Property type">
                <select
                  value={form.propertyType}
                  onChange={(e) => set("propertyType", e.target.value as PropertyType)}
                  className="input"
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {formatPropertyType(t)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="BHK (optional)">
                <input value={form.bhk} onChange={(e) => set("bhk", e.target.value)} className="input" type="number" min="0" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="City">
                <input required value={form.city} onChange={(e) => set("city", e.target.value)} className="input" />
              </Field>
              <Field label="State">
                <input required value={form.state} onChange={(e) => set("state", e.target.value)} className="input" />
              </Field>
            </div>

            <Field label="Locality">
              <input required value={form.locality} onChange={(e) => set("locality", e.target.value)} className="input" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Price (INR)">
                <input
                  required
                  type="number"
                  min="0"
                  value={form.priceInr}
                  onChange={(e) => set("priceInr", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Area (sqft)">
                <input
                  required
                  type="number"
                  min="0"
                  value={form.areaSqft}
                  onChange={(e) => set("areaSqft", e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <Field label="Amenities (comma separated)">
              <input value={form.amenities} onChange={(e) => set("amenities", e.target.value)} className="input" />
            </Field>

            <Field label="Listing URL">
              <input value={form.listingUrl} onChange={(e) => set("listingUrl", e.target.value)} className="input" />
            </Field>

            <Field label="Image URL">
              <input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} className="input" />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="input"
                rows={3}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 border-t border-brand-100 px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-brand-600">{label}</span>
      {children}
    </label>
  );
}
