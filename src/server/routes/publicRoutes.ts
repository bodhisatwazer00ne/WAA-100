import { Router } from 'express';
import { z } from 'zod';
import { sendEmail } from '../services/emailService';

const router = Router();

const notifySchema = z.object({
  absences: z.array(
    z.object({
      studentName: z.string().min(1),
      email: z.string().email(),
      subjectName: z.string().min(1),
      className: z.string().min(1),
      date: z.string().min(1),
      riskCategory: z.enum(['safe', 'moderate', 'high']),
      subjectPct: z.number().min(0).max(100),
    }),
  ),
});

function resolveEmail(studentName: string, email: string) {
  if (studentName.trim().toLowerCase() === 'aarav patil') {
    return 'madlad.howdoyoufeelnow@gmail.com';
  }
  return email;
}

router.post('/notify-absences', async (req, res) => {
  const parse = notifySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }

  const { absences } = parse.data;

  const results = await Promise.allSettled(
    absences.map((a) =>
      sendEmail({
        to: resolveEmail(a.studentName, a.email),
        subject: `Absence Alert: ${a.subjectName} (${a.date})`,
        text:
          `Dear ${a.studentName},\n\n` +
          `You were marked absent for ${a.subjectName} on ${a.date} in ${a.className}.\n` +
          `Current risk category in ${a.subjectName}: ${a.riskCategory.toUpperCase()}.\n` +
          `Current attendance in ${a.subjectName}: ${a.subjectPct.toFixed(2)}%.\n\n` +
          `Please ensure regular attendance.\n` +
          `- WAA-100`,
      }),
    ),
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.length - sent;
  const failures = results
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.status === 'rejected')
    .map(({ r, i }) => ({
      email: resolveEmail(absences[i].studentName, absences[i].email),
      reason: r.status === 'rejected' ? String(r.reason) : '',
    }));

  res.json({ total: results.length, sent, failed, failures });
});

const testEmailSchema = z.object({
  to: z.string().email(),
});

router.post('/test-email', async (req, res) => {
  const parse = testEmailSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }

  try {
    const result = await sendEmail({
      to: parse.data.to,
      subject: 'WAA-100 SMTP Test Email',
      text:
        'This is a test email from WAA-100.\n\n' +
        `Sent at: ${new Date().toISOString()}`,
    });
    return res.json({ ok: true, result });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error) });
  }
});

export default router;
