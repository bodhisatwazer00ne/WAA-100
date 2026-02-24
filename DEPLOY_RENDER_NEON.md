# Deploy WAA-100 on Render + Neon

This guide deploys:

- Frontend: Render Static Site
- Backend: Render Web Service
- Database: Neon Postgres
- Email: Gmail SMTP

## 1) Prepare Neon Postgres

1. Create a Neon project and database.
2. Copy the Postgres connection string (with SSL enabled).
3. Keep it for backend `DATABASE_URL`.

## 2) Backend on Render (Web Service)

Create a new **Web Service** from this repository.

- Root Directory: project root
- Build Command:

```sh
npm install && npm run prisma:generate && npm run server:build
```

- Start Command:

```sh
npx prisma migrate deploy && npm run server:start
```

Set backend environment variables:

- `DATABASE_URL=<neon_connection_string>`
- `JWT_SECRET=<strong_random_secret>`
- `JWT_EXPIRES_IN=7d`
- `APP_BASE_URL=https://<your-frontend-service>.onrender.com`
- `SMTP_SERVICE=gmail`
- `SMTP_USER=<your-gmail-address>`
- `SMTP_PASS=<gmail-app-password>`
- `SMTP_FROM=WAA-100 <<your-gmail-address>>`
- `SMTP_REQUIRE_TLS=true`
- Leave `SMTP_URL` and `SMTP_HOST` empty when using Gmail service

Notes:

- Backend port is automatically read from Render `PORT`.
- Health endpoint:

```txt
GET /api/health
```

Expected:

```json
{"status":"ok","name":"WAA-100"}
```

## 3) Frontend on Render (Static Site)

Create a new **Static Site** from the same repository.

- Root Directory: project root
- Build Command:

```sh
npm install && npm run build
```

- Publish Directory:

```txt
dist
```

Set frontend environment variable:

- `VITE_API_BASE_URL=https://<your-backend-service>.onrender.com`

## 4) CORS alignment

Ensure backend `APP_BASE_URL` is exactly the deployed frontend URL.

## 5) Post-deploy verification

1. Frontend loads successfully.
2. Login works for HOD/Teacher/Student.
3. Attendance marking persists and duplicate-day lock works.
4. PDFs download correctly:
   - Mark Attendance
   - Your Class Report (matrix)
   - Defaulter / Non-defaulter
   - HOD defaulter list
5. Email flow works:
   - Mark Aarav Patil absent
   - Verify email is sent to `conama2551@dolofan.com`

## 6) Optional SMTP smoke test

```sh
curl -X POST "https://<your-backend-service>.onrender.com/api/public/test-email" ^
  -H "Content-Type: application/json" ^
  -d "{\"to\":\"conama2551@dolofan.com\"}"
```

