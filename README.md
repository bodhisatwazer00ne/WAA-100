# WAA-100

WAA-100 is a full-stack academic attendance system with role-based access for:
- HOD
- Teacher
- Student

It supports attendance marking, analytics dashboards, defaulter workflows, PDF exports, and absence email notifications.

## Tech Stack

- Frontend: Vite + React + TypeScript + Tailwind + shadcn/ui
- Backend: Node.js + Express (TypeScript)
- Database: PostgreSQL (Neon compatible) + Prisma ORM
- Auth: JWT + bcrypt
- Scheduler: node-cron
- Charts: Recharts
- PDFs: frontend PDF table utilities + backend pdfkit route
- Email: Mailgun API (primary) with SMTP fallback support in code

## Current Architecture

- Frontend and backend are separate services.
- Frontend calls backend via `VITE_API_BASE_URL`.
- Backend uses `DATABASE_URL` (Neon recommended in deployment).
- Frontend routing uses `HashRouter` (`#/...`) for safer static hosting behavior.

## Features

### Teacher
- Mark attendance by class + subject + date
- Date visible at top while marking
- Re-open existing day and download day PDF
- Defaulter list by selected class/subject
- "Your Class's Report" (for class teachers) with date/date-range analytics and PDFs

### HOD
- Dashboard tabs:
  - Faculty Wise Stats
  - Class Wise Stats
  - Subject Wise Stats
  - Defaulter List
- Graphs added for faculty/class/subject/defaulter views
- Faculty mapping view (`/reports/faculty`)

### Student
- My attendance view
- Dashboard with subject-wise and trend analytics
- Recovery simulator

## Email Delivery Notes (Important)

- Mailgun sandbox only sends to **authorized recipients**.
- This project currently has an allowlist in backend code for sandbox safety.
- If an email is not authorized in Mailgun sandbox, provider will reject with `403`.

## Environment Variables

Create local `.env` from `.env.example` and fill values.

### Required backend vars
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (e.g. `7d`)
- `APP_BASE_URL` (frontend origin)

### Mailgun (recommended)
- `MAILGUN_API_KEY`
- `MAILGUN_DOMAIN`
- `MAILGUN_FROM`
- `MAILGUN_API_BASE_URL` (default `https://api.mailgun.net`)

### SMTP fallback (optional)
- `SMTP_URL` or `SMTP_SERVICE`/`SMTP_HOST` + auth vars
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_REQUIRE_TLS`

### Frontend var (build-time)
- `VITE_API_BASE_URL` = backend public URL (e.g. `https://<backend>.onrender.com`)

## Local Development

### 1) Install
```bash
npm install
```

### 2) Prisma
```bash
npx prisma generate
npx prisma migrate dev --name init
```

Optional seed:
```bash
npm run prisma:seed
```

### 3) Start backend
```bash
npm run server:dev
```
Backend default: `http://localhost:4000`

### 4) Start frontend
```bash
npm run dev
```
Frontend default from config: `http://localhost:8080`

Optional custom dev port:
```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

## Build Commands

- Frontend build: `npm run build`
- Backend build: `npm run server:build`
- Backend prod start (after build): `npm run server:start`
- Fullstack local dev: `npm run start:fullstack`

## Deployment (Render + Neon)

Use:
- `DEPLOY_RENDER_NEON.md`
- `render.yaml`

Recommended order:
1. Deploy backend web service (with backend env vars)
2. Verify backend health: `/api/health`
3. Deploy frontend static site with `VITE_API_BASE_URL` pointing to backend

## Credentials

- Active login credentials are maintained in:
  - `LOGIN_CREDENTIALS.md`

## Project Structure

- `prisma/` - schema, migrations, seed/helpers
- `src/server/` - backend routes, services, middleware, analytics, cron
- `src/pages/` - frontend pages and role flows
- `src/components/` - layout and reusable UI
- `src/lib/` - frontend API + PDF helpers
