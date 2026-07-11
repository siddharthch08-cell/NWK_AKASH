# Phase 2 academic workflow architecture

## Ownership

```text
Admin and student UI entry points
              |
              v
Next.js route wrapper: authenticate -> parse -> domain call -> safe response
              |
       +------+-------------------------------+
       |                                      |
       v                                      v
CourseBatchService                    BatchEnrollmentService
       |                                      |
       +-------------------+------------------+
                           v
              StudentContentAccessPolicy
                           |
          +----------------+----------------+
          |                |                |
          v                v                v
   MaterialService  ContentLifecycle  TestPublicationService
                                             |
                                             v
                                  TestAttemptService
                                  - persisted shuffle order
                                  - revisioned answer upsert
                                  - idempotent finalization
                                             |
                                             v
                                  VideoProgressService
                                  - session heartbeats
                                  - server-derived percent
```

Course content remains course-owned:

```text
Batch -> BatchCourse -> Course -> Chapter -> Topic -> Video
                              \-> Material
```

A batch shown in the material form is optional eligibility validation context;
it never owns the material. Every active enrolled student receives a published
material through an active batch assignment to its published course.

## Lifecycle and access

Student access requires an `APPROVED` or `ACTIVE` student account, an enrollment
in an `ACTIVE` batch, a valid course/test assignment, and accessible lifecycle
state for every parent. Upcoming/completed/archived batches do not grant active
academic access. Archived parents hide all children without deleting progress,
answers, attempts, or audit history.

Chapter, topic, and video DELETE archives by default. Permanent deletion is
restricted to unreferenced draft content. Restore is explicit and a child
cannot be restored through an archived parent.

## Concurrency invariants

- SQLite write-lock no-op updates serialize capacity checks and attempt starts.
- `(batchId, userId)`, `(batchId, courseId)`, and
  `(attemptId, questionId)` are database-unique.
- Answer writes use the compound key and monotonic client revisions. A delayed
  older request cannot overwrite a newer intended answer.
- Attempt question and option order are JSON snapshots persisted on the attempt.
- Finalization reads persisted answers and is idempotent.

## Migration retention rule

`20260703183000_phase2_integrity` removes duplicate answers before creating the
compound unique index. For each attempt/question pair it retains the row with
the greatest SQLite `rowid`, meaning the last inserted legacy row. Runtime
revisions provide deterministic ordering after migration.

## Date semantics

API dates must be valid ISO-8601. Values without an offset are interpreted as
UTC. PATCH validators load the current row, merge supplied fields, and validate
the final range.

## Browser video limitation

The server cannot prove that a human watched every frame in a third-party
embedded player. It can reject a one-shot `percent=100`, constrain forward
credit by elapsed heartbeat time, persist a session, require an end-position
signal, and derive percent from cumulative plausible playback. This raises the
integrity bar but is not DRM or proctoring. Completion uses the configured
`videoCompletionThreshold` and at least 80% reported end position.

## Compatibility wrappers

- `POST/DELETE /api/admin/batches/[id]/assign-courses`
- `POST /api/admin/courses/[id]/assign-batches`
- `GET/PUT /api/admin/courses/[id]/batches`
- `POST /api/admin/batches/[id]/assign-students`
- `POST /api/admin/batches/[id]/remove-student`
- `GET/POST /api/admin/students/[id]/batches`

These routes remain because working batch-centric and student/course-centric UI
entry points call them. They delegate mutations to the same domain owners.
