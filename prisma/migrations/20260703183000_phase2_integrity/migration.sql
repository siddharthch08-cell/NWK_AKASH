-- Phase 2 integrity migration.
-- Duplicate answer retention rule: keep the row with the greatest SQLite
-- rowid (the last inserted answer) for each attempt/question pair.
DELETE FROM AttemptAnswer
WHERE rowid NOT IN (
  SELECT MAX(rowid)
  FROM AttemptAnswer
  GROUP BY attemptId, questionId
);

CREATE UNIQUE INDEX IF NOT EXISTS
  AttemptAnswer_attemptId_questionId_key
  ON AttemptAnswer(attemptId, questionId);

ALTER TABLE Video ADD COLUMN archivedAt DATETIME;

ALTER TABLE VideoProgress
  ADD COLUMN watchedSeconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE VideoProgress
  ADD COLUMN lastHeartbeatAt DATETIME;
ALTER TABLE VideoProgress
  ADD COLUMN lastSessionId TEXT;

ALTER TABLE TestAttempt ADD COLUMN questionOrder TEXT;
ALTER TABLE TestAttempt ADD COLUMN optionOrder TEXT;

ALTER TABLE AttemptAnswer
  ADD COLUMN updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE AttemptAnswer
  ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
