import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../db/client.js';

const router = Router();

router.use(authMiddleware);

router.get('/classes', async (_req, res) => {
  const rows = await prisma.class.findMany({
    select: { id: true, name: true, semester: true },
    orderBy: { name: 'asc' },
  });
  res.json(rows);
});

router.get('/student/:studentId', async (req, res) => {
  const { studentId } = req.params;
  const cache = await prisma.analyticsCache.findUnique({ where: { studentId } });
  if (!cache) return res.status(404).json({ error: 'Analytics not found' });
  res.json(cache);
});

router.get('/class/:classId', async (req, res) => {
  const { classId } = req.params;
  const students = await prisma.student.findMany({
    where: { classId },
    include: { user: true, analytics: true },
  });
  res.json(
    students.map(s => ({
      student: {
        id: s.id,
        name: s.user.name,
        rollNumber: s.rollNumber,
      },
      analytics: s.analytics[0] ?? null,
    })),
  );
});

router.get('/risk-distribution', async (req, res) => {
  const { classId } = req.query as { classId?: string };
  const students = await prisma.student.findMany({
    where: classId ? { classId } : {},
    include: { analytics: true },
  });
  let safe = 0;
  let moderate = 0;
  let high = 0;
  for (const s of students) {
    const a = s.analytics[0];
    if (!a || a.riskLevel === 'safe') safe++;
    else if (a.riskLevel === 'moderate') moderate++;
    else high++;
  }
  res.json({ safe, moderate, high, total: students.length });
});

router.get('/department/summary', async (_req, res) => {
  const classes = await prisma.class.findMany({
    include: {
      students: {
        include: { analytics: true },
      },
    },
  });

  const classSummary = classes.map(c => {
    const students = c.students;
    const avgPct =
      students.reduce((sum, s) => sum + (s.analytics[0]?.overallPct ?? 0), 0) /
      (students.length || 1);
    let safe = 0;
    let moderate = 0;
    let high = 0;
    for (const s of students) {
      const a = s.analytics[0];
      if (!a || a.riskLevel === 'safe') safe++;
      else if (a.riskLevel === 'moderate') moderate++;
      else high++;
    }
    return {
      id: c.id,
      name: c.name,
      students: students.length,
      avgPct: Math.round(avgPct),
      safe,
      moderate,
      high,
    };
  });

  res.json(classSummary);
});

router.get('/department/subject-performance', async (_req, res) => {
  const subjects = await prisma.subject.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: 'asc' },
  });

  const records = await prisma.attendanceRecord.findMany({
    select: { subjectId: true, status: true },
  });

  const rows = subjects.map(subject => {
    const subjectRecords = records.filter(record => record.subjectId === subject.id);
    const present = subjectRecords.filter(record => record.status === 'present').length;
    const total = subjectRecords.length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      pct,
      present,
      total,
    };
  });

  res.json(rows);
});

export default router;


