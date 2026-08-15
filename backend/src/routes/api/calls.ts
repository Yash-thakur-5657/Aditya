import { Router } from "express";
import { calls } from "../../db/repository";

export const callsRouter = Router();

callsRouter.get("/", (req, res) => {
  res.json(calls.list());
});

callsRouter.get("/:id", (req, res) => {
  const call = calls.get(req.params.id);
  if (!call) return res.status(404).json({ error: "not_found" });
  res.json({ ...call, messages: calls.messages(call.id) });
});
