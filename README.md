## WAA-100 – Web-based Academic Attendance 100% Monitoring System

WAA-100 is a full-stack academic attendance monitoring platform with role-based dashboards for **Teacher**, **Class Teacher**, **HOD**, and **Student**. It provides fine-grained attendance capture, risk analytics, PDF reporting, and email notifications.

### Tech Stack

- **Frontend**: Vite + React + TypeScript + shadcn-ui + Tailwind CSS
- **Backend**: Node.js + Express (TypeScript)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (email + password, bcrypt hashing)
- **Scheduling**: node-cron
- **PDF**: pdfkit
- **Email**: Nodemailer (SMTP)

### Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a DATABASE_URL you control)

### 1. Environment setup

1. Copy the example env file:

```sh
cp .env.example .env
```

2. Edit `.env` and update:

- `DATABASE_URL` to point at your Postgres instance
- `JWT_SECRET` to a strong random value
- SMTP fields if you want real emails (optional in development)

### 2. Install dependencies

```sh
npm install
```

### Deployment (Render + Neon)

Use the production deployment guide:

- [DEPLOY_RENDER_NEON.md](./DEPLOY_RENDER_NEON.md)

Important frontend env (build-time):

- `VITE_API_BASE_URL=https://<your-backend-service>.onrender.com`

### 3. Database migration & seed

```sh
npx prisma migrate dev --name init
npx prisma generate
npx ts-node prisma/seed.ts
```

This creates the schema and seeds demo users:

- HOD: `rajesh@university.edu` / `password123`
- Class Teacher: `anita@university.edu` / `password123`
- Teacher: `priya@university.edu` / `password123`
- Students: `student1@student.edu` … `student30@student.edu` / `password123`

### 4. Run backend and frontend

In one terminal:

```sh
npm run server:dev
```

In another terminal:

```sh
npm run dev
```

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

Or run both together:

```sh
npm run start:fullstack
```

### 5. High-level architecture

- `prisma/schema.prisma`: database schema (users, departments, classes, subjects, attendance_records, merged_class_reports, analytics_cache, audit_logs, notifications, etc.)
- `src/server/index.ts`: Express app bootstrap and route registration
- `src/server/routes/*`: REST APIs for auth, attendance, analytics, notifications, reports, recovery simulator
- `src/server/services/*`: business logic, email sending, domain services
- `src/server/analytics/analyticsEngine.ts`: analytics computation and caching
- `src/server/cron/jobs.ts`: daily merged reports + weekly analytics recomputation

The React frontend (under `src/`) provides dashboards and flows for all roles and consumes the REST API.
