-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InstituteSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "instituteName" TEXT NOT NULL DEFAULT 'Naya Wallah Kanoon',
    "tagline" TEXT NOT NULL DEFAULT 'New Law, New Way',
    "logo" TEXT,
    "favicon" TEXT,
    "primaryEmail" TEXT,
    "primaryPhone" TEXT,
    "address" TEXT,
    "mapsEmbedUrl" TEXT,
    "heroTitle" TEXT NOT NULL DEFAULT 'Naya Wallah Kanoon — New Law, New Way',
    "heroSubtitle" TEXT NOT NULL DEFAULT 'Industry-leading courses, expert faculty, and a learning experience designed for your success.',
    "heroImage" TEXT,
    "aboutMission" TEXT,
    "aboutVision" TEXT,
    "aboutText" TEXT,
    "statStudents" INTEGER NOT NULL DEFAULT 0,
    "statCourses" INTEGER NOT NULL DEFAULT 0,
    "statPassRate" INTEGER NOT NULL DEFAULT 0,
    "statExperience" INTEGER NOT NULL DEFAULT 0,
    "socialFacebook" TEXT,
    "socialTwitter" TEXT,
    "socialLinkedin" TEXT,
    "socialYoutube" TEXT,
    "socialInstagram" TEXT,
    "socialWhatsApp" TEXT,
    "videoCompletionThreshold" INTEGER NOT NULL DEFAULT 90,
    "defaultMaxAttempts" INTEGER NOT NULL DEFAULT 2,
    "maxUploadMb" INTEGER NOT NULL DEFAULT 20,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "revenueEnabled" BOOLEAN NOT NULL DEFAULT false,
    "certificatesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InstituteSetting_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InstituteSetting" ("aboutMission", "aboutText", "aboutVision", "address", "certificatesEnabled", "defaultMaxAttempts", "favicon", "heroImage", "heroSubtitle", "heroTitle", "id", "instituteName", "logo", "maintenanceMode", "mapsEmbedUrl", "maxUploadMb", "primaryEmail", "primaryPhone", "revenueEnabled", "socialFacebook", "socialInstagram", "socialLinkedin", "socialTwitter", "socialYoutube", "statCourses", "statExperience", "statPassRate", "statStudents", "tagline", "updatedAt", "updatedBy", "videoCompletionThreshold") SELECT "aboutMission", "aboutText", "aboutVision", "address", "certificatesEnabled", "defaultMaxAttempts", "favicon", "heroImage", "heroSubtitle", "heroTitle", "id", "instituteName", "logo", "maintenanceMode", "mapsEmbedUrl", "maxUploadMb", "primaryEmail", "primaryPhone", "revenueEnabled", "socialFacebook", "socialInstagram", "socialLinkedin", "socialTwitter", "socialYoutube", "statCourses", "statExperience", "statPassRate", "statStudents", "tagline", "updatedAt", "updatedBy", "videoCompletionThreshold" FROM "InstituteSetting";
DROP TABLE "InstituteSetting";
ALTER TABLE "new_InstituteSetting" RENAME TO "InstituteSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
