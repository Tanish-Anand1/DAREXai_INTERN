/*
  Warnings:

  - You are about to drop the column `ip` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `target` on the `AuditLog` table. All the data in the column will be lost.
  - Added the required column `resourceType` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `AuditLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `metadata` on table `AuditLog` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropIndex
DROP INDEX "AuditLog_tenantId_action_idx";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "ip",
DROP COLUMN "target",
ADD COLUMN     "ipAddress" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "resourceId" TEXT,
ADD COLUMN     "resourceType" TEXT NOT NULL,
ADD COLUMN     "userAgent" TEXT NOT NULL DEFAULT 'unknown',
ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "metadata" SET NOT NULL,
ALTER COLUMN "metadata" SET DEFAULT '{}';

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
