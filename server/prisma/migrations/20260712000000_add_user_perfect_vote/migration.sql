-- CreateTable
CREATE TABLE "UserPerfectVote" (
    "userId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,

    CONSTRAINT "UserPerfectVote_pkey" PRIMARY KEY ("userId","photoId")
);

-- AddForeignKey
ALTER TABLE "UserPerfectVote" ADD CONSTRAINT "UserPerfectVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPerfectVote" ADD CONSTRAINT "UserPerfectVote_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
