-- Two-step verification (TOTP). Additive only: nullable columns, no data changes.
ALTER TABLE "users" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "users" ADD COLUMN "totpEnabledAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "totpLastStep" INTEGER;
