-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "requestedUsername" TEXT,
    "username" TEXT,
    "number" INTEGER,
    "refCode" TEXT NOT NULL,
    "confirmToken" TEXT NOT NULL,
    "manageToken" TEXT NOT NULL,
    "referredById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "userId" TEXT,
    "locale" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_email_key" ON "WaitlistEntry"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_username_key" ON "WaitlistEntry"("username");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_number_key" ON "WaitlistEntry"("number");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_refCode_key" ON "WaitlistEntry"("refCode");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_confirmToken_key" ON "WaitlistEntry"("confirmToken");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_manageToken_key" ON "WaitlistEntry"("manageToken");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_userId_key" ON "WaitlistEntry"("userId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_referredById_idx" ON "WaitlistEntry"("referredById");

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "WaitlistEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- One counter for every Genesis/Pioneer number, whether it comes from the
-- waitlist or a direct signup. Starts after any number already handed out.
CREATE SEQUENCE "genesis_number_seq";
SELECT setval('"genesis_number_seq"', COALESCE((SELECT MAX("genesisNo") FROM "User"), 0) + 1, false);
