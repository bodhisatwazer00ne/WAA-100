# WAA-100 - Web-based Academic Attendance Monitoring

WAA-100 is a full-stack attendance platform with role-based dashboards for **HOD**, **Teacher**, and **Student**, including attendance marking, date/range analytics, defaulter views, PDF exports, and absence email alerts.

## Tech Stack

- **Frontend**: Vite + React + TypeScript + shadcn-ui + Tailwind CSS
- **Backend**: Node.js + Express (TypeScript)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT + bcrypt
- **Scheduling**: node-cron
- **Email**: Nodemailer (SMTP)
- **PDF**:
  - Frontend table/matrix PDFs via `src/lib/pdf.ts`
  - Backend PDF endpoint (`src/server/routes/reportRoutes.ts`) uses `pdfkit`

## Prerequisites

- Node.js 18+
- PostgreSQL (local or managed, e.g. Neon)

## Local Setup

### 1) Environment

Create `.env` from `.env.example` and fill required values:

- `DATABASE_URL`
- `JWT_SECRET`
- SMTP values if you want real email delivery

### 2) Install

```sh
npm install
```

### 3) Prisma

```sh
npx prisma migrate dev --name init
npx prisma generate
```

Optional seed:

```sh
npx ts-node prisma/seed.ts
```

Use the currently maintained credentials in `LOGIN_CREDENTIALS.md`.

### 4) Run app

Backend:

```sh
npm run server:dev
```

Frontend:

```sh
npm run dev
```

Default URLs:

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:8080` (from `vite.config.ts`)

If you prefer `5173`:

```sh
npm run dev -- --host 127.0.0.1 --port 5173
```

## Deployment (Render + Neon)

Use:

- [DEPLOY_RENDER_NEON.md](./DEPLOY_RENDER_NEON.md)

Important frontend build-time env:

- `VITE_API_BASE_URL=https://<your-backend-service>.onrender.com`

## Notes on Data Behavior

- Backend APIs persist data in PostgreSQL via Prisma.
- Some frontend pages use local mock data and browser localStorage (`src/data/mockData.ts`) for runtime/demo flows.

## Key Project Structure

- `prisma/schema.prisma`: DB schema
- `src/server/index.ts`: backend bootstrap
- `src/server/routes/*`: auth, attendance, analytics, notifications, reports, recovery, public mail routes
- `src/server/services/*`: auth, attendance, email services
- `src/server/cron/jobs.ts`: scheduled jobs
- `src/pages/*`: role-based dashboard and workflow pages
- `src/lib/pdf.ts`: frontend PDF generation utilities
