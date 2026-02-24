import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import notificationRoutes from './routes/notificationRoutes';
import reportRoutes from './routes/reportRoutes';
import recoveryRoutes from './routes/recoveryRoutes';
import publicRoutes from './routes/publicRoutes';
import { startCronJobs } from './cron/jobs';
import { verifySmtpConnection } from './services/emailService';

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
  verifySmtpConnection().then((result) => {
    if (result.ok) {
      console.log('SMTP connection verified');
    } else {
      console.warn(`SMTP not ready: ${result.reason}`);
    }
  });
  startCronJobs();
});
