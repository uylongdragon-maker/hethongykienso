-- CreateTable
CREATE TABLE "Petition" (
    "id" TEXT NOT NULL,
    "petitionCode" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "resolution" TEXT,
    "reminderDoc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Petition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Petition_petitionCode_key" ON "Petition"("petitionCode");
