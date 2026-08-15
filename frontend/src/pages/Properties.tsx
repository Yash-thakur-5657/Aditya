import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatPropertyType, formatPriceInr } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { Button, Card, EmptyState, Spinner } from "../components/ui";
import type { Property, PropertyType } from "../lib/types";
import { PropertyFormModal } from "../components/PropertyFormModal";

const PROPERTY_TYPES: PropertyType[] = ["apartment", "villa", "independent_house", "plot", "commercial", "pg"];

export function Properties() {
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);

  function load() {
    api.properties
      .list({ city: cityFilter || undefined, propertyType: typeFilter || undefined })
      .then(setProperties)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityFilter, typeFilter]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    await api.properties.remove(id);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Properties"
        subtitle="The live listings inventory the agent recommends from"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            + Add property
          </Button>
        }
      />
      <div className="space-y-4 p-8">
        <div className="flex flex-wrap gap-3">
          <input
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Filter by city..."
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            <option value="">All types</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatPropertyType(t)}
              </option>
            ))}
          </select>
        </div>

        <Card>
          {error && <p className="p-4 text-sm text-red-600">{error}</p>}
          {!properties ? (
            <Spinner />
          ) : properties.length === 0 ? (
            <EmptyState title="No properties found" subtitle="Add your first listing to get started" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-brand-400">
                    <th className="px-5 py-3 font-medium">Title</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Location</th>
                    <th className="px-5 py-3 font-medium">Price</th>
                    <th className="px-5 py-3 font-medium">BHK</th>
                    <th className="px-5 py-3 font-medium">Area</th>
                    <th className="px-5 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p) => (
                    <tr key={p.id} className="border-b border-brand-50 last:border-0 hover:bg-brand-50/50">
                      <td className="px-5 py-3 font-medium text-brand-900">{p.title}</td>
                      <td className="px-5 py-3 text-brand-600">{formatPropertyType(p.propertyType)}</td>
                      <td className="px-5 py-3 text-brand-600">
                        {p.locality}, {p.city}
                      </td>
                      <td className="px-5 py-3 tabular-nums text-brand-900">{formatPriceInr(p.priceInr)}</td>
                      <td className="px-5 py-3 text-brand-600">{p.bhk ?? "–"}</td>
                      <td className="px-5 py-3 text-brand-600">{p.areaSqft.toLocaleString("en-IN")} sqft</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => {
                            setEditing(p);
                            setModalOpen(true);
                          }}
                          className="mr-3 text-xs font-medium text-brand-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {modalOpen && (
        <PropertyFormModal
          property={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}
