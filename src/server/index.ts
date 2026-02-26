import express from 'express';
import cors from 'cors';
import { env } from './core/config/env.js';
import { notFoundHandler, errorHandler } from './core/middleware/errorHandler.js';
import authRoutes from './modules/auth/authRoutes.js';
import attendanceRoutes from './modules/attendance/attendanceRoutes.js';
import analyticsRoutes from './modules/analytics/analyticsRoutes.js';
import notificationRoutes from './modules/notifications/notificationRoutes.js';
import reportRoutes from './modules/reports/reportRoutes.js';
import recoveryRoutes from './modules/recovery/recoveryRoutes.js';
import publicRoutes from './modules/public/publicRoutes.js';
import { startCronJobs } from './core/cron/jobs.js';
import { verifyEmailConnection } from './modules/notifications/emailService.js';

const app = express();

app.use(
  cors({
    origin: [env.appBaseUrl, 'http://127.0.0.1:5173', 'http://localhost:5173'],
    credentials: true,
  }),
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'WAA-100' });
});

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api', attendanceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recovery', recoveryRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`WAA-100 backend listening on port ${env.port}`);
  verifyEmailConnection().then((result) => {
    if (result.ok) {
      console.log(`Email provider ready (${result.provider})${result.detail ? `: ${result.detail}` : ''}`);
    } else {
      console.warn(`Email provider not ready (${result.provider}): ${result.reason}`);
    }
  });
  startCronJobs();
});


