-- SQLite requires a temporary default when adding a NOT NULL column to an
-- existing table. Rebuild after the hashing migration so new token families
-- must always be supplied explicitly by application code.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "rotatedFrom" TEXT,
    "familyId" TEXT NOT NULL,
    "revokedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_RefreshToken" ("id", "userId", "token", "userAgent", "ip", "rotatedFrom", "familyId", "revokedAt", "expiresAt", "createdAt")
SELECT "id", "userId", "token", "userAgent", "ip", "rotatedFrom", "familyId", "revokedAt", "expiresAt", "createdAt" FROM "RefreshToken";

DROP TABLE "RefreshToken";
ALTER TABLE "new_RefreshToken" RENAME TO "RefreshToken";
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
