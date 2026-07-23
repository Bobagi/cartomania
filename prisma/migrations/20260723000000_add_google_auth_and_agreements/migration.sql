-- Google / OpenID sign-in + versioned Terms/Privacy acceptance.
-- All additive: nullable columns, a partial-unique behaviour via NULLs, a new table,
-- and a CHECK that every account keeps at least one credential.

-- 1) Password becomes optional (Google-only accounts have no local password).
ALTER TABLE "Player" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- 2) Google identity + verified email.
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "googleId" VARCHAR(255);
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- Unique when present. Postgres treats NULLs as distinct, so the many password-only
-- accounts (NULL email/googleId) never collide.
CREATE UNIQUE INDEX IF NOT EXISTS "Player_email_key" ON "Player" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Player_googleId_key" ON "Player" ("googleId");

-- 3) An account must always have a way to sign in: either a password or a Google id.
ALTER TABLE "Player" DROP CONSTRAINT IF EXISTS "Player_has_credential";
ALTER TABLE "Player"
  ADD CONSTRAINT "Player_has_credential"
  CHECK ("passwordHash" IS NOT NULL OR "googleId" IS NOT NULL);

-- 4) Append-only agreement-acceptance log.
CREATE TABLE IF NOT EXISTS "AgreementAcceptance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "playerId" UUID NOT NULL,
  "documentVersion" VARCHAR(40) NOT NULL,
  "ipAddress" VARCHAR(64),
  "userAgent" VARCHAR(512),
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgreementAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AgreementAcceptance_playerId_documentVersion_idx"
  ON "AgreementAcceptance" ("playerId", "documentVersion");

ALTER TABLE "AgreementAcceptance"
  ADD CONSTRAINT "AgreementAcceptance_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
