# EDULEARN PRO

> **Advanced Learning Management System** — A production-ready LMS for educational institutes. Manage students, batches, courses, video lectures, timed MCQ tests, leaderboards, and analytics.

---

## ✨ Features

### Public Website
- Professional landing page with hero, about, courses preview, announcements ticker
- Contact form with spam protection + rate limiting
- SEO-optimized with Open Graph + structured data
- Fully responsive (320px → 4K)

### Admin Portal
- **Dashboard** — real-time analytics with charts (student growth, batch enrollment, video engagement)
- **Students** — approve/reject/block/bulk-approve, assign batches, export CSV
- **Batches** — create, assign students/courses/tests, archive
- **Courses** — chapters → topics → videos hierarchy, YouTube ID validation
- **Materials** — secure PDF/assignment upload (MIME check, magic bytes, size limit)
- **Tests** — timed MCQ, max 20 questions, max 2 attempts, server-side scoring
- **Analytics & Leaderboard** — batch-wise rankings with deterministic tie-breakers
- **Announcements** — public / all-students / batch-specific with priority + expiry
- **Audit Logs** — append-only record of all admin actions
- **Reports** — Excel exports with formula-injection protection
- **Settings** — institute branding, hero content, social links, feature flags

### Student Portal
- **Dashboard** — personalized greeting, continue learning, upcoming tests, recent results
- **My Batches & Courses** — only shows assigned content (authorization enforced)
- **Video Player** — YouTube IFrame API with privacy-enhanced embed, progress heartbeats, resume
- **Tests** — timed countdown, auto-submit on expiry, answer review after submission
- **Results** — progress chart, best/average scores, detailed answer comparison
- **Leaderboard** — batch-wise ranking with your position highlighted
- **Profile** — update details, change password, view active sessions

---

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 (strict) |
| **Styling** | Tailwind CSS v4 + shadcn/ui (New York) |
| **Database** | Prisma ORM + SQLite (dev) / PostgreSQL (prod) |
| **Auth** | JWT (jose) + bcryptjs (12 rounds) + refresh tokens |
| **State** | Zustand (client) + React Query patterns |
| **Charts** | Recharts |
| **Exports** | ExcelJS (formula-injection safe) |
| **Icons** | Lucide React |
| **Validation** | Zod |
| **Rate Limiting** | In-memory sliding window |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ or Bun 1.0+
- A SQLite or PostgreSQL database

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/edulearn-pro.git
cd edulearn-pro

# 2. Install dependencies
bun install

# 3. Configure environment
cp .env.example .env
# Edit .env with your values (generate JWT secrets: openssl rand -base64 32)

# 4. Create database schema
bun run db:push

# 5. Seed demo data
bun run db:seed

# 6. Start the dev server
bun run dev
```

Open **http://localhost:3000** in your browser.

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@edulearn.pro` | `Admin@12345` |
| Student (Active) | `aarav@example.com` | `Student@12345` |
| Student (Pending) | `ananya@example.com` | `Student@12345` |
| Student (Blocked) | `sneha@example.com` | `Student@12345` |

---

## 📁 Project Structure

```
edulearn-pro/
├── prisma/
│   └── schema.prisma              # 30+ database models
├── scripts/
│   └── seed.ts                    # Demo data seeder
├── public/                        # Static assets
├── docs/                          # Architecture & API documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── DEPLOYMENT.md
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # SPA entry (Zustand view router)
│   │   ├── globals.css            # Tailwind v4 + custom @utility
│   │   └── api/                   # 50+ REST API routes
│   │       ├── auth/              # register, login, logout, me, change-password
│   │       ├── public/            # announcements, batches, contact, settings
│   │       ├── admin/             # dashboard, students, batches, courses, tests...
│   │       └── student/           # dashboard, batches, courses, tests, attempts...
│   ├── components/
│   │   ├── providers/             # Theme provider
│   │   ├── ui/                    # 45+ shadcn/ui components
│   │   └── edulearn/
│   │       ├── shared/            # Boot screen, helpers (useApi, StatCard)
│   │       ├── public/            # Landing page, login, register
│   │       ├── admin/             # Admin shell + 17 admin pages
│   │       └── student/           # Student shell + 15 student pages
│   ├── config/
│   │   └── index.ts               # Centralized app configuration
│   ├── hooks/                     # use-mobile, use-toast
│   ├── lib/                       # Backend utilities
│   │   ├── auth.ts                # JWT + bcrypt + session
│   │   ├── api-response.ts        # Standard response envelope
│   │   ├── api-client.ts          # Frontend fetch wrapper
│   │   ├── audit.ts               # Audit log writer
│   │   ├── constants.ts           # All enums & config values
│   │   ├── validation.ts          # Zod schemas
│   │   ├── test-engine.ts         # Server-side scoring (transactional)
│   │   ├── storage.ts             # File upload security
│   │   ├── rate-limit.ts          # Sliding-window rate limiter
│   │   ├── settings.ts            # Institute settings singleton
│   │   ├── youtube.ts             # YouTube ID extraction
│   │   ├── format.ts              # Date/grade/status helpers
│   │   └── utils.ts               # cn() helper
│   ├── stores/
│   │   └── app-store.ts           # Zustand: auth + view router
│   └── types/
│       └── index.ts               # Shared domain types
├── .env.example                   # Environment template
├── Dockerfile                     # Production container
├── docker-compose.yml             # Full-stack with PostgreSQL
└── package.json
```

---

## 🔒 Security Features

- **Authentication**: JWT access tokens (15-min TTL) + rotating refresh tokens (7 days)
- **Password Security**: bcrypt with 12 salt rounds, strength validation, lockout after 5 failed attempts
- **Authorization**: Role-based access (ADMIN / STUDENT) enforced on every API route
- **IDOR Protection**: Ownership checks on all student `[id]` routes
- **Test Integrity**: Server-side scoring (never trust client), authoritative timer, max 2 attempts, max 20 questions
- **File Upload Security**: MIME validation, magic-byte check, filename sanitization, size limit, path-traversal guard
- **Rate Limiting**: Login, register, contact form, password change
- **Audit Logging**: Append-only record of all admin actions with IP, user-agent, request ID
- **Export Safety**: CSV/Excel exports escape formula injection (=, +, -, @)
- **No Sensitive Data Leaks**: All queries use `select` to exclude password hashes/tokens

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server on port 3000 |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | ESLint check |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Create a migration |
| `bun run db:seed` | Seed demo data |

---

## 🧪 Test Workflow (Manual QA)

1. **Register** a new student → should see "Pending Approval" screen
2. **Login as admin** → approve the pending student
3. **Login as student** → access dashboard, courses, video lectures
4. **Watch a video** → progress saves, marks complete at 90%
5. **Take a test** → timer counts down, auto-submits on expiry, see result with answer review
6. **Check leaderboard** → your rank appears highlighted
7. **Export reports** → Excel downloads with proper formatting

---

## 📚 Documentation

- [Architecture Decisions](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

---

## 🚢 Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for Vercel, Railway, VPS, and Docker instructions.

**Quick deploy (Vercel):**
1. Push to GitHub
2. Import repo on vercel.com
3. Add env vars (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`)
4. Run `bun run db:push` + `bun run db:seed` once
5. Done — auto-deploys on every push

---

## 📄 License

MIT License — see [LICENSE](./LICENSE).

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

Built with ❤️ for educators and learners.
