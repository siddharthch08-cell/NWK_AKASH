-- Existing raw refresh tokens cannot be transformed with stock SQLite SHA-256.
-- Revoke them by deletion; users re-authenticate once after deployment.
DELETE FROM RefreshToken;

ALTER TABLE RefreshToken ADD COLUMN familyId TEXT NOT NULL DEFAULT '';
CREATE INDEX RefreshToken_familyId_idx ON RefreshToken(familyId);

ALTER TABLE AuditLog ADD COLUMN outcome TEXT NOT NULL DEFAULT 'SUCCESS';
