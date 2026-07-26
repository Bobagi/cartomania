-- Keep the Google profile picture separate from the current avatar choice, so it
-- remains a selectable option in the avatar picker even after switching to card art.
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "googleAvatarUrl" VARCHAR(255);

-- Backfill existing Google accounts: their current avatar IS the Google picture.
UPDATE "Player"
   SET "googleAvatarUrl" = "avatarUrl"
 WHERE "googleId" IS NOT NULL
   AND "googleAvatarUrl" IS NULL
   AND "avatarUrl" LIKE 'https://lh3.googleusercontent.com/%';
