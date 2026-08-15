import { Router } from "express";
import { db } from "../../db/db";

export const analyticsRouter = Router();

analyticsRouter.get("/summary", (req, res) => {
  const totalCalls = (db.prepare("SELECT COUNT(*) c FROM calls").get() as any).c as number;
  const totalLeads = (db.prepare("SELECT COUNT(*) c FROM leads").get() as any).c as number;
  const matchedLeads = (
    db.prepare("SELECT COUNT(*) c FROM leads WHERE status IN ('matched','whatsapp_sent')").get() as any
  ).c as number;
  const whatsappSent = (
    db.prepare("SELECT COUNT(*) c FROM whatsapp_messages WHERE status NOT IN ('failed','skipped_no_credentials')").get() as any
  ).c as number;
  const avgDuration = (
    db.prepare("SELECT AVG(duration_seconds) a FROM calls WHERE duration_seconds IS NOT NULL").get() as any
  ).a as number | null;

  const callsPerDay = db
    .prepare(
      `SELECT date(started_at) as day, COUNT(*) as count
       FROM calls
       WHERE started_at >= date('now', '-14 days')
       GROUP BY date(started_at)
       ORDER BY day ASC`
    )
    .all();

  const topCities = db
    .prepare(
      `SELECT city, COUNT(*) as count
       FROM leads
       WHERE city IS NOT NULL
       GROUP BY city
       ORDER BY count DESC
       LIMIT 8`
    )
    .all();

  const propertyTypeBreakdown = db
    .prepare(
      `SELECT property_type as propertyType, COUNT(*) as count
       FROM leads
       WHERE property_type IS NOT NULL
       GROUP BY property_type
       ORDER BY count DESC`
    )
    .all();

  const leadStatusBreakdown = db
    .prepare(`SELECT status, COUNT(*) as count FROM leads GROUP BY status`)
    .all();

  res.json({
    totalCalls,
    totalLeads,
    matchedLeads,
    whatsappSent,
    conversionRate: totalLeads > 0 ? Math.round((matchedLeads / totalLeads) * 100) : 0,
    avgCallDurationSeconds: avgDuration ? Math.round(avgDuration) : null,
    callsPerDay,
    topCities,
    propertyTypeBreakdown,
    leadStatusBreakdown,
  });
});
