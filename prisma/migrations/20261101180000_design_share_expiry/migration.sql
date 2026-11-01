-- Links already out get the same 10 days from now.
ALTER TABLE "design_shares" ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 days');
ALTER TABLE "design_shares" ALTER COLUMN "expiresAt" DROP DEFAULT;
