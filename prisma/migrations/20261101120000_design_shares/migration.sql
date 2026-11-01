-- CreateTable
CREATE TABLE "design_shares" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT,
    "spec" JSONB NOT NULL,
    "surfaces" JSONB NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "design_shares_token_key" ON "design_shares"("token");

-- CreateIndex
CREATE UNIQUE INDEX "design_shares_projectId_key" ON "design_shares"("projectId");

-- AddForeignKey
ALTER TABLE "design_shares" ADD CONSTRAINT "design_shares_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "design_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
