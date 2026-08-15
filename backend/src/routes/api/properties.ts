import { Router } from "express";
import { z } from "zod";
import { properties } from "../../db/repository";

export const propertiesRouter = Router();

const propertySchema = z.object({
  title: z.string().min(1),
  propertyType: z.enum(["apartment", "villa", "independent_house", "plot", "commercial", "pg"]),
  city: z.string().min(1),
  state: z.string().min(1),
  locality: z.string().min(1),
  priceInr: z.number().positive(),
  bhk: z.number().int().positive().nullable().optional(),
  areaSqft: z.number().positive(),
  amenities: z.array(z.string()).default([]),
  imageUrl: z.string().default(""),
  listingUrl: z.string().default(""),
  description: z.string().default(""),
});

propertiesRouter.get("/", (req, res) => {
  const { city, propertyType, q } = req.query;
  let list = properties.all();
  if (city) list = list.filter((p) => p.city.toLowerCase() === String(city).toLowerCase());
  if (propertyType) list = list.filter((p) => p.propertyType === propertyType);
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.locality.toLowerCase().includes(needle) ||
        p.city.toLowerCase().includes(needle)
    );
  }
  res.json(list);
});

propertiesRouter.get("/:id", (req, res) => {
  const property = properties.get(req.params.id);
  if (!property) return res.status(404).json({ error: "not_found" });
  res.json(property);
});

propertiesRouter.post("/", (req, res) => {
  const parsed = propertySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  const created = properties.create({ ...parsed.data, bhk: parsed.data.bhk ?? null });
  res.status(201).json(created);
});

propertiesRouter.put("/:id", (req, res) => {
  const parsed = propertySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  const updated = properties.update(req.params.id, parsed.data as any);
  if (!updated) return res.status(404).json({ error: "not_found" });
  res.json(updated);
});

propertiesRouter.delete("/:id", (req, res) => {
  properties.remove(req.params.id);
  res.status(204).send();
});
