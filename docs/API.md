# API Reference — Naya Wallah Kanoon

All API routes follow a standard response envelope:

```typescript
// Success
{ "success": true, "data": {}, "message": "...", "meta": {} }

// Error
{ "success": false, "error": { "code": "...", "message": "...", "fields": {} }, "requestId": "..." }
```

## Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Student registration (PENDING status) | Public |
| POST | `/api/auth/login` | Login (admin or student) | Public |
| POST | `/api/auth/refresh` | Rotate the refresh-token family and issue a new access token | Refresh cookie |
| POST | `/api/auth/logout` | Revoke refresh token + clear cookies | Authenticated |
| GET | `/api/auth/me` | Get current user session | Authenticated |
| POST | `/api/auth/change-password` | Change password (revokes all refresh tokens) | Authenticated |

## Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/settings` | Institute settings (public fields only) |
| GET | `/api/public/announcements` | Public, published, non-expired announcements |
| GET | `/api/public/batches` | Active + upcoming batches (preview) |
| GET | `/api/public/stats` | Public stat counts |
| POST | `/api/public/contact` | Submit contact form (rate-limited, honeypot) |

## Admin (requires ADMIN role)

### Dashboard & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard stats + charts data |
| GET | `/api/admin/leaderboard` | Aggregated student leaderboard |

### Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/students` | List (paginated, search, filter) |
| POST | `/api/admin/students` | Bulk approve |
| GET | `/api/admin/students/[id]` | Full profile |
| PATCH | `/api/admin/students/[id]` | Update name/phone/photo |
| DELETE | `/api/admin/students/[id]` | Soft-delete (archive) |
| POST | `/api/admin/students/[id]/approve` | Approve (PENDING → APPROVED) |
| POST | `/api/admin/students/[id]/reject` | Reject (body: `{ reason? }`) |
| POST | `/api/admin/students/[id]/block` | Block |
| POST | `/api/admin/students/[id]/unblock` | Unblock (BLOCKED → ACTIVE) |
| POST | `/api/admin/students/[id]/activate` | Activate (APPROVED → ACTIVE) |
| POST | `/api/admin/students/[id]/deactivate` | Deactivate |
| GET/POST | `/api/admin/students/[id]/batches` | Get/assign batch enrollments |
| GET | `/api/admin/students/export` | CSV export |

### Batches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/batches` | List (paginated) |
| POST | `/api/admin/batches` | Create |
| GET | `/api/admin/batches/[id]` | Detail (students, courses, tests) |
| PATCH | `/api/admin/batches/[id]` | Update |
| DELETE | `/api/admin/batches/[id]` | Archive |
| POST | `/api/admin/batches/[id]/assign-students` | Enroll students |
| POST | `/api/admin/batches/[id]/remove-student` | Remove enrollment |
| POST | `/api/admin/batches/[id]/assign-courses` | Assign courses |
| GET | `/api/admin/batches/[id]/export` | CSV of enrolled students |

### Courses & Content
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/courses` | List / Create |
| GET/PATCH/DELETE | `/api/admin/courses/[id]` | Detail / Update / Archive |
| POST | `/api/admin/courses/[id]/assign-batches` | Assign to batches |
| GET/POST | `/api/admin/courses/[id]/chapters` | List / Add chapter |
| PATCH/DELETE | `/api/admin/chapters/[id]` | Update / archive; hard-delete only safe unreferenced draft history |
| GET/POST | `/api/admin/chapters/[id]/topics` | List / Add topic |
| PATCH/DELETE | `/api/admin/topics/[id]` | Update / archive; hard-delete only safe unreferenced draft history |
| GET/POST | `/api/admin/topics/[id]/videos` | List / Add video |
| PATCH/DELETE | `/api/admin/videos/[id]` | Update / archive; hard-delete only safe unreferenced draft history |
| POST | `/api/admin/videos/[id]/publish` | Change status |
| POST | `/api/admin/videos/[id]/reorder` | Reorder videos |

### Materials
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/materials` | List / Upload (multipart) |
| GET/DELETE | `/api/admin/materials/[id]` | Download / Archive |

### Tests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/tests` | List / Create |
| GET/PATCH/DELETE | `/api/admin/tests/[id]` | Detail / Update / Archive |
| POST | `/api/admin/tests/[id]/publish` | Publish |
| POST | `/api/admin/tests/[id]/archive` | Archive |
| POST | `/api/admin/tests/[id]/duplicate` | Duplicate (DRAFT copy) |
| GET/POST | `/api/admin/tests/[id]/questions` | List / Add question |
| PATCH/DELETE | `/api/admin/tests/[id]/questions/[qid]` | Update / Delete question |

### Communication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/announcements` | List / Create |
| GET/PATCH/DELETE | `/api/admin/announcements/[id]` | Detail / Update / Archive |
| GET | `/api/admin/contact` | List contact messages |
| GET/PATCH | `/api/admin/contact/[id]` | Detail (auto-marks READ) / Update status |
| GET | `/api/admin/feedback` | List feedback |
| GET/PATCH | `/api/admin/feedback/[id]` | Detail / Update status |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/audit-logs` | List (paginated, filterable) |
| GET/PATCH | `/api/admin/settings` | Get / Update institute settings |
| GET | `/api/admin/reports/students` | Excel export |
| GET | `/api/admin/reports/batches` | Excel export |
| GET | `/api/admin/reports/attempts` | Excel export |
| GET | `/api/admin/reports/leaderboard` | Excel export |

## Student (requires ACTIVE/APPROVED student)

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student/dashboard` | Personalized dashboard data |

### Learning
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student/batches` | Enrolled batches |
| GET | `/api/student/batches/[id]` | Batch detail (auth-checked) |
| GET | `/api/student/courses` | Courses from enrolled batches |
| GET | `/api/student/courses/[id]` | Course with chapters/topics/videos |
| GET | `/api/student/videos/[id]/progress` | Video detail + saved progress |
| POST | `/api/student/videos/[id]/progress` | Heartbeat (position, percent) |

### Materials
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student/materials` | Available materials |
| GET | `/api/student/materials/[id]/download` | Download (auth-checked) |

### Tests & Attempts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student/tests` | Categorized tests (active/upcoming/completed/expired) |
| GET | `/api/student/tests/[id]` | Test detail + attempt history |
| POST | `/api/student/tests/[id]/start` | Start/resume attempt (returns questions without isCorrect) |
| GET/POST | `/api/student/attempts/[id]` | Get active attempt / Submit (finalize: true/false) |
| GET | `/api/student/attempts/active` | Check for in-progress attempt |
| GET | `/api/student/results` | All submitted attempts |
| GET | `/api/student/results/[id]` | Result detail with answer review |

### Engagement
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student/leaderboard` | Batch-wise leaderboard (your rank highlighted) |
| GET | `/api/student/announcements` | Announcements relevant to you |
| GET/POST | `/api/student/feedback` | List your feedback / Submit new |
| GET/PATCH | `/api/student/profile` | Get / Update profile |

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400/422 | Invalid input fields |
| `UNAUTHORIZED` | 401 | Not authenticated / invalid token |
| `FORBIDDEN` | 403 | Not authorized for this resource |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Duplicate resource |
| `RATE_LIMITED` | 429 | Too many requests |
| `QUESTION_LIMIT_REACHED` | 400 | Test has max questions already |
| `ATTEMPT_LIMIT_REACHED` | 400 | Student used all attempts |
| `TEST_NOT_AVAILABLE` | 400 | Test outside availability window |
| `TEST_EXPIRED` | 400 | Test end date passed |
| `INVALID_STATE` | 400 | Invalid status transition |
| `INTERNAL_ERROR` | 500 | Server error |
