-- AlterTable
ALTER TABLE "packaging_templates" ADD COLUMN     "industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;
