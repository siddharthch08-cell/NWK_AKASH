# Phase 2 integrity migration

Before the compound answer index is created, duplicate answers are reduced to
the row with the greatest SQLite `rowid` for each `(attemptId, questionId)`.
This is deterministic and preserves the last inserted answer. Runtime writes
then use Prisma's compound-key `upsert`, so each question has exactly one
answer and the last committed save wins.

The attempt order columns persist deterministic per-attempt question and
option order. Video heartbeat columns track plausible cumulative playback.
