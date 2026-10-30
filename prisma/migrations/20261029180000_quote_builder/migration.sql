-- Quote builder: per-quote lines, quantity options and the option the customer approved.
ALTER TABLE "quotation_offers" ADD COLUMN "details" JSONB,
ADD COLUMN "selectedOption" INTEGER;
