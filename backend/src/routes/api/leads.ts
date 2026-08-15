import { Router } from "express";
import { leads, calls, properties } from "../../db/repository";

export const leadsRouter = Router();

leadsRouter.get("/", (req, res) => {
  const list = leads.list();
  res.json(list);
});

leadsRouter.get("/:id", (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) return res.status(404).json({ error: "not_found" });

  const call = lead.callId ? calls.get(lead.callId) : null;
  const messages = lead.callId ? calls.messages(lead.callId) : [];
  const matchedProperties = lead.matchedPropertyIds
    .map((id) => properties.get(id))
    .filter((p): p is NonNullable<typeof p> => p !== null);

  res.json({ ...lead, call, messages, matchedProperties });
});
