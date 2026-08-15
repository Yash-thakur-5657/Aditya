CREATE TABLE IF NOT EXISTS properties (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  property_type   TEXT NOT NULL,
  city            TEXT NOT NULL,
  state           TEXT NOT NULL,
  locality        TEXT NOT NULL,
  price_inr       INTEGER NOT NULL,
  bhk             INTEGER,
  area_sqft       INTEGER NOT NULL,
  amenities       TEXT NOT NULL DEFAULT '[]',
  image_url       TEXT NOT NULL DEFAULT '',
  listing_url     TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_properties_city_type ON properties(city, property_type);
CREATE INDEX IF NOT EXISTS idx_properties_state ON properties(state);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price_inr);

CREATE TABLE IF NOT EXISTS calls (
  id                TEXT PRIMARY KEY,
  lead_id           TEXT,
  from_number       TEXT,
  twilio_call_sid   TEXT,
  source            TEXT NOT NULL DEFAULT 'call',
  started_at        TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at          TEXT,
  duration_seconds  INTEGER,
  status            TEXT NOT NULL DEFAULT 'ringing'
);

CREATE TABLE IF NOT EXISTS call_messages (
  id          TEXT PRIMARY KEY,
  call_id     TEXT NOT NULL REFERENCES calls(id),
  role        TEXT NOT NULL,
  text        TEXT NOT NULL,
  language    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_call_messages_call ON call_messages(call_id);

CREATE TABLE IF NOT EXISTS leads (
  id                    TEXT PRIMARY KEY,
  full_name             TEXT,
  phone_number          TEXT NOT NULL,
  preferred_language    TEXT,
  city                  TEXT,
  state                 TEXT,
  locality              TEXT,
  property_type         TEXT,
  budget_min_inr        INTEGER,
  budget_max_inr        INTEGER,
  bhk_preference        INTEGER,
  status                TEXT NOT NULL DEFAULT 'in_progress',
  source                TEXT NOT NULL DEFAULT 'call',
  call_id               TEXT REFERENCES calls(id),
  matched_property_ids  TEXT NOT NULL DEFAULT '[]',
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone_number);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id            TEXT PRIMARY KEY,
  lead_id       TEXT NOT NULL REFERENCES leads(id),
  to_number     TEXT NOT NULL,
  body          TEXT NOT NULL,
  twilio_sid    TEXT,
  status        TEXT NOT NULL DEFAULT 'queued',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
