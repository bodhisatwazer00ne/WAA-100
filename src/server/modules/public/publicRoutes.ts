import { Router } from 'express';
import { z } from 'zod';
import { sendEmail } from '../notifications/emailService.js';

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
  const allowedEmails = new Set([
    'theyellowflashlegend@gmail.com',
    'madlad.howdoyoufeelnow@gmail.com',
    'bodhisatwa.zeroone@gmail.com',
  ]);
  const normalized = studentName.trim().toLowerCase();
  if (normalized === 'harry james potter') return 'theyellowflashlegend@gmail.com';
  if (normalized === 'steven grant rogers') return 'madlad.howdoyoufeelnow@gmail.com';
  if (normalized === 'natasha alianovna romanoff') return 'bodhisatwa.zeroone@gmail.com';
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === 'harry.potter@student.edu') return 'theyellowflashlegend@gmail.com';
  if (normalizedEmail === 'steven.rogers@student.edu') return 'madlad.howdoyoufeelnow@gmail.com';
  if (normalizedEmail === 'natasha.romanoff@student.edu') return 'bodhisatwa.zeroone@gmail.com';
  if (allowedEmails.has(normalizedEmail)) return normalizedEmail;
  return '';
}

router.post('/notify-absences', async (req, res) => {
  const parse = notifySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }

  const { absences } = parse.data;

  const outcomes: Array<{ ok: boolean; email: string; reason?: string }> = [];

  for (const a of absences) {
    const targetEmail = resolveEmail(a.studentName, a.email);
    if (!targetEmail) {
      outcomes.push({ ok: false, email: a.email, reason: 'Recipient not authorized for sandbox sending' });
      continue;
    }
    try {
      await sendEmail({
        to: targetEmail,
        subject: `Absence Alert: ${a.subjectName} (${a.date})`,
        text:
          `Dear ${a.studentName},\n\n` +
          `You were marked absent for ${a.subjectName} on ${a.date} in ${a.className}.\n` +
          `Current risk category in ${a.subjectName}: ${a.riskCategory.toUpperCase()}.\n` +
          `Current attendance in ${a.subjectName}: ${a.subjectPct.toFixed(2)}%.\n\n` +
          `Please ensure regular attendance.\n` +
          `- WAA-100`,
      });
      outcomes.push({ ok: true, email: targetEmail });
    } catch (error) {
      outcomes.push({ ok: false, email: targetEmail, reason: String(error) });
    }
  }

  const sent = outcomes.filter((o) => o.ok).length;
  const failed = outcomes.length - sent;
  const failures = outcomes
    .filter((o) => !o.ok)
    .map((o) => ({
      email: o.email,
      reason: o.reason ?? 'Unknown send error',
    }));

  res.json({ total: outcomes.length, sent, failed, failures });
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
      subject: 'WAA-100 Email Provider Test',
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


