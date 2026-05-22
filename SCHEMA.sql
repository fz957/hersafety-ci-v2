-- ============================================================
-- HerSafety CI — Schema PostgreSQL v3.0
-- Stack : Knex migrations (reference)
-- Architecture : Multi-tenant (organization_id partout)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM TYPES
CREATE TYPE org_type AS ENUM ('ong', 'entreprise', 'universite');
CREATE TYPE user_role AS ENUM ('user', 'admin', 'superadmin');
CREATE TYPE alert_level AS ENUM ('1', '2', '3', '4');
CREATE TYPE alert_status AS ENUM ('active', 'resolved', 'false_alarm');
CREATE TYPE track_status AS ENUM ('active', 'completed', 'interrupted');
CREATE TYPE checkin_response AS ENUM ('ok', 'no_response', 'escalated');
CREATE TYPE place_type AS ENUM ('police', 'gendarmerie', 'pharmacie', 'pompiers', 'hopital', 'autre');
CREATE TYPE contact_relation AS ENUM ('famille', 'ami', 'collegue', 'autre');
CREATE TYPE testimony_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE report_status AS ENUM ('pending', 'verified', 'refuted');
CREATE TYPE report_type AS ENUM ('lieu', 'chauffeur');
CREATE TYPE danger_type AS ENUM ('harcelement_verbal', 'agression_physique', 'agression_sexuelle', 'vol', 'suivi', 'detour_force', 'autre');

-- TABLE : organizations (tenants)
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  type        org_type NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT,
  address     TEXT,
  join_code   TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE : users
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  phone           TEXT,
  full_name       TEXT,
  role            user_role NOT NULL DEFAULT 'user',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  onboarding_done BOOLEAN NOT NULL DEFAULT false,
  is_demo         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE : login_attempts (anti brute force)
CREATE TABLE login_attempts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        TEXT NOT NULL,
  ip_address   TEXT,
  success      BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE : refresh_tokens
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE : contacts
CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  phone           TEXT NOT NULL,
  relation        contact_relation NOT NULL DEFAULT 'autre',
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION check_max_contacts()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM contacts WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 contacts autorises';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER max_contacts_trigger
  BEFORE INSERT ON contacts
  FOR EACH ROW EXECUTE FUNCTION check_max_contacts();

-- TABLE : alerts
CREATE TABLE alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  level           alert_level NOT NULL,
  status          alert_status NOT NULL DEFAULT 'active',
  location_lat    DECIMAL(10, 8),
  location_lng    DECIMAL(11, 8),
  location_label  TEXT,
  sms_sent        BOOLEAN NOT NULL DEFAULT false,
  sms_sent_at     TIMESTAMPTZ,
  contacts_count  INTEGER DEFAULT 0,
  is_simulated    BOOLEAN NOT NULL DEFAULT false,
  resolved_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE : tracks
CREATE TABLE tracks (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status               track_status NOT NULL DEFAULT 'active',
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at             TIMESTAMPTZ,
  destination_label    TEXT,
  checkin_interval_min INTEGER DEFAULT 10,
  waypoints            JSONB DEFAULT '[]',
  alert_id             UUID REFERENCES alerts(id)
);

-- TABLE : checkins
CREATE TABLE checkins (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_id        UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response        checkin_response NOT NULL DEFAULT 'no_response',
  responded_at    TIMESTAMPTZ,
  location_lat    DECIMAL(10, 8),
  location_lng    DECIMAL(11, 8)
);

-- TABLE : safe_places
CREATE TABLE safe_places (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            place_type NOT NULL,
  lat             DECIMAL(10, 8) NOT NULL,
  lng             DECIMAL(11, 8) NOT NULL,
  address         TEXT,
  phone           TEXT,
  is_verified     BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  opening_hours   TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE : emergency_numbers
CREATE TABLE emergency_numbers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  number        TEXT NOT NULL,
  type          place_type NOT NULL,
  is_national   BOOLEAN NOT NULL DEFAULT true,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE : sms_logs
CREATE TABLE sms_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id        UUID REFERENCES alerts(id),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id),
  phone_to        TEXT NOT NULL,
  message         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  is_simulated    BOOLEAN NOT NULL DEFAULT false,
  provider_ref    TEXT,
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE : testimonies
CREATE TABLE testimonies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_anonymous    BOOLEAN NOT NULL DEFAULT true,
  display_name    TEXT,
  category        danger_type NOT NULL,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  location_label  TEXT,
  status          testimony_status NOT NULL DEFAULT 'pending',
  support_count   INTEGER NOT NULL DEFAULT 0,
  moderated_by    UUID REFERENCES users(id),
  moderated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE : testimony_reactions
CREATE TABLE testimony_reactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  testimony_id UUID NOT NULL REFERENCES testimonies(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction     TEXT NOT NULL DEFAULT 'support',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(testimony_id, user_id)
);

-- TABLE : reports
CREATE TABLE reports (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_anonymous      BOOLEAN NOT NULL DEFAULT true,
  report_type       report_type NOT NULL,
  place_name        TEXT,
  place_address     TEXT,
  place_lat         DECIMAL(10, 8),
  place_lng         DECIMAL(11, 8),
  vehicle_plate     TEXT,
  vtc_app           TEXT,
  danger_type       danger_type NOT NULL,
  description       TEXT NOT NULL,
  incident_date     DATE,
  status            report_status NOT NULL DEFAULT 'pending',
  verified_by       UUID REFERENCES users(id),
  verified_at       TIMESTAMPTZ,
  verification_note TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE : system_logs
CREATE TABLE system_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level      TEXT NOT NULL DEFAULT 'info',
  source     TEXT NOT NULL,
  message    TEXT NOT NULL,
  details    JSONB,
  user_id    UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DONNEES INITIALES
INSERT INTO emergency_numbers (name, number, type, is_national, display_order) VALUES
  ('Police nationale',            '110',  'police',      true, 1),
  ('Gendarmerie nationale',       '111',  'gendarmerie', true, 2),
  ('Sapeurs-pompiers',            '180',  'pompiers',    true, 3),
  ('SAMU',                        '185',  'hopital',     true, 4),
  ('Ligne VBG - Ministere Femme', '1308', 'autre',       true, 5);

-- INDEXES
CREATE INDEX idx_users_org          ON users(organization_id);
CREATE INDEX idx_contacts_user      ON contacts(user_id);
CREATE INDEX idx_alerts_user        ON alerts(user_id);
CREATE INDEX idx_alerts_org         ON alerts(organization_id);
CREATE INDEX idx_alerts_created     ON alerts(created_at DESC);
CREATE INDEX idx_tracks_user        ON tracks(user_id);
CREATE INDEX idx_tracks_status      ON tracks(status);
CREATE INDEX idx_checkins_track     ON checkins(track_id);
CREATE INDEX idx_sms_alert          ON sms_logs(alert_id);
CREATE INDEX idx_testimonies_org    ON testimonies(organization_id);
CREATE INDEX idx_testimonies_status ON testimonies(status);
CREATE INDEX idx_reports_org        ON reports(organization_id);
CREATE INDEX idx_reports_status     ON reports(status);
CREATE INDEX idx_login_email        ON login_attempts(email);
CREATE INDEX idx_login_time         ON login_attempts(attempted_at DESC);

-- VUE zones dangereuses
CREATE VIEW dangerous_places AS
  SELECT
    place_name, place_address, place_lat, place_lng,
    COUNT(*) as total_reports,
    COUNT(*) FILTER (WHERE status = 'verified') as verified_reports,
    MAX(created_at) as last_reported_at
  FROM reports
  WHERE report_type = 'lieu'
    AND status != 'refuted'
    AND place_lat IS NOT NULL
  GROUP BY place_name, place_address, place_lat, place_lng
  HAVING COUNT(*) FILTER (WHERE status = 'verified') >= 3;

-- FONCTION pseudo anonyme
CREATE OR REPLACE FUNCTION generate_anonymous_name()
RETURNS TEXT AS $$
DECLARE
  adj  TEXT[] := ARRAY['Courageuse','Forte','Brave','Resiliente','Libre'];
  noun TEXT[] := ARRAY['Lionne','Etoile','Flamme','Guerriere','Lumiere'];
BEGIN
  RETURN adj[1 + floor(random() * 5)::int] ||
         noun[1 + floor(random() * 5)::int] ||
         floor(random() * 999)::TEXT;
END;
$$ LANGUAGE plpgsql;