/*
  Warnings:

  - You are about to drop the column `address` on the `Petition` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `Petition` table. All the data in the column will be lost.
  - You are about to drop the column `reminderDoc` on the `Petition` table. All the data in the column will be lost.
  - You are about to drop the column `resolution` on the `Petition` table. All the data in the column will be lost.
  - You are about to drop the column `sender` on the `Petition` table. All the data in the column will be lost.
  - Added the required column `authority` to the `Petition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `directUnit` to the `Petition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `Petition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receivedDate` to the `Petition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reviewStatus` to the `Petition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderAddress` to the `Petition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderName` to the `Petition` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Petition" DROP COLUMN "address",
DROP COLUMN "department",
DROP COLUMN "reminderDoc",
DROP COLUMN "resolution",
DROP COLUMN "sender",
ADD COLUMN     "authority" TEXT NOT NULL,
ADD COLUMN     "directUnit" TEXT NOT NULL,
ADD COLUMN     "extendedUntil" TIMESTAMP(3),
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "receivedDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "replyDocDate" TIMESTAMP(3),
ADD COLUMN     "replyDocLink" TEXT,
ADD COLUMN     "replyDocNumber" TEXT,
ADD COLUMN     "reviewStatus" TEXT NOT NULL,
ADD COLUMN     "senderAddress" TEXT NOT NULL,
ADD COLUMN     "senderName" TEXT NOT NULL,
ADD COLUMN     "senderPhone" TEXT;
