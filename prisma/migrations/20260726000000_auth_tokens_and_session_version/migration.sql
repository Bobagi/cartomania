-- Session revocation counter + one-time auth tokens (email verification / password reset).

-- 1) tokenVersion on Player (bumping it invalidates all outstanding JWTs).
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- 2) Auth token purpose enum.
DO $$ BEGIN
  CREATE TYPE "AuthTokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3) One-time tokens (only the SHA-256 hash is stored).
CREATE TABLE IF NOT EXISTS "AuthToken" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "playerId" UUID NOT NULL,
  "purpose" "AuthTokenPurpose" NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthToken_tokenHash_key" ON "AuthToken" ("tokenHash");
CREATE INDEX IF NOT EXISTS "AuthToken_playerId_purpose_idx" ON "AuthToken" ("playerId", "purpose");

ALTER TABLE "AuthToken"
  ADD CONSTRAINT "AuthToken_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
