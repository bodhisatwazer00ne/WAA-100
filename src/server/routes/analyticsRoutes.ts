import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import type { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware);

async function canAccessClass(userId: string, role: Role, classId: string) {
  if (role === 'hod') return true;

  if (role === 'student') {
    const student = await prisma.student.findUnique({ where: { userId } });
    return !!student && student.classId === classId;
  }

  const classAsTeacher = await prisma.class.findFirst({
    where: {
      id: classId,
      classTeacherId: userId,
    },
    select: { id: true },
  });
  if (classAsTeacher) return true;

  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) return false;

  const mapping = await prisma.teacherClassSubject.findFirst({
    where: {
      teacherId: teacher.id,
      classId,
    },
    select: { id: true },
  });
  return !!mapping;
}

router.get('/classes', async (req, res) => {
  const role = req.auth!.role;
  const userId = req.auth!.userId;

  if (role === 'student') {
    const student = await prisma.student.findUnique({
      where: { userId },
      include: { class: true },
    });
    const rows = student
      ? [{ id: student.class.id, name: student.class.name, semester: student.class.semester }]
      : [];
    return res.json(rows);
  }

  if (role === 'hod') {
    const rows = await prisma.class.findMany({
      select: { id: true, name: true, semester: true },
      orderBy: { name: 'asc' },
    });
    return res.json(rows);
  }

  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) return res.json([]);

  const mappings = await prisma.teacherClassSubject.findMany({
    where: { teacherId: teacher.id },
    include: { class: true },
  });
  const rows = Array.from(
    new Map(mappings.map(mapping => [mapping.class.id, mapping.class])).values(),
  )
    .map(classRow => ({ id: classRow.id, name: classRow.name, semester: classRow.semester }))
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json(rows);
});

router.get('/student/:studentId', async (req, res) => {
  const { studentId } = req.params;
  const role = req.auth!.role;
  const userId = req.auth!.userId;

  if (role === 'student') {
    const self = await prisma.student.findUnique({ where: { userId } });
    if (!self || self.id !== studentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  } else if (role === 'teacher' || role === 'class_teacher') {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const access = await canAccessClass(userId, role, student.classId);
    if (!access) return res.status(403).json({ error: 'Forbidden' });
  }

  const cache = await prisma.analyticsCache.findUnique({ where: { studentId } });
  if (!cache) return res.status(404).json({ error: 'Analytics not found' });
  res.json(cache);
});

router.get('/class/:classId', async (req, res) => {
  const { classId } = req.params;
  const allowed = await canAccessClass(req.auth!.userId, req.auth!.role, classId);
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });

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
  if (classId) {
    const allowed = await canAccessClass(req.auth!.userId, req.auth!.role, classId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  } else if (req.auth!.role !== 'hod') {
    return res.status(403).json({ error: 'Forbidden' });
  }

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

router.get('/department/summary', async (req, res) => {
  if (req.auth!.role !== 'hod') {
    return res.status(403).json({ error: 'Forbidden' });
  }

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

router.get('/department/subject-performance', async (req, res) => {
  if (req.auth!.role !== 'hod') {
    return res.status(403).json({ error: 'Forbidden' });
  }

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

router.get('/hod/faculty-stats', async (req, res) => {
  if (req.auth!.role !== 'hod') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  if (startDate && endDate && startDate > endDate) {
    return res.status(400).json({ error: 'Invalid date range' });
  }

  const dateFilter = startDate || endDate
    ? {
        gte: startDate ? new Date(`${startDate}T00:00:00.000Z`) : undefined,
        lt: endDate ? new Date(`${endDate}T23:59:59.999Z`) : undefined,
      }
    : undefined;

  const teachers = await prisma.teacher.findMany({
    include: {
      user: true,
      classesTaught: {
        include: {
          class: true,
          subject: true,
        },
      },
    },
    orderBy: { user: { name: 'asc' } },
  });

  const attendance = await prisma.attendanceRecord.findMany({
    where: dateFilter ? { attendanceDate: dateFilter } : {},
    select: {
      teacherId: true,
      classId: true,
      subjectId: true,
      status: true,
      attendanceDate: true,
    },
  });

  const rows = teachers.map(teacher => {
    const records = attendance.filter(record => record.teacherId === teacher.id);
    const classStatsMap = new Map<string, { classId: string; className: string; present: number; total: number; sessions: number }>();
    const subjectStatsMap = new Map<string, { subjectId: string; subjectName: string; present: number; total: number; sessions: number }>();

    for (const mapping of teacher.classesTaught) {
      classStatsMap.set(mapping.classId, {
        classId: mapping.classId,
        className: mapping.class.name,
        present: 0,
        total: 0,
        sessions: 0,
      });
      subjectStatsMap.set(mapping.subjectId, {
        subjectId: mapping.subjectId,
        subjectName: mapping.subject.name,
        present: 0,
        total: 0,
        sessions: 0,
      });
    }

    for (const record of records) {
      const classStat = classStatsMap.get(record.classId);
      if (classStat) {
        classStat.total += 1;
        if (record.status === 'present') classStat.present += 1;
      }
      const subjectStat = subjectStatsMap.get(record.subjectId);
      if (subjectStat) {
        subjectStat.total += 1;
        if (record.status === 'present') subjectStat.present += 1;
      }
    }

    for (const classStat of classStatsMap.values()) {
      const classSessions = new Set(
        records
          .filter(record => record.classId === classStat.classId)
          .map(record => `${record.classId}-${record.subjectId}-${record.attendanceDate.toISOString().split('T')[0]}`),
      );
      classStat.sessions = classSessions.size;
    }

    for (const subjectStat of subjectStatsMap.values()) {
      const subjectSessions = new Set(
        records
          .filter(record => record.subjectId === subjectStat.subjectId)
          .map(record => `${record.classId}-${record.subjectId}-${record.attendanceDate.toISOString().split('T')[0]}`),
      );
      subjectStat.sessions = subjectSessions.size;
    }

    const classStats = Array.from(classStatsMap.values()).map(stat => ({
      ...stat,
      pct: stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0,
    }));
    const subjectStats = Array.from(subjectStatsMap.values()).map(stat => ({
      ...stat,
      pct: stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0,
    }));

    return {
      teacherId: teacher.user.id,
      teacherName: teacher.user.name,
      classStats,
      subjectStats,
    };
  });

  res.json(rows);
});

router.get('/hod/defaulters', async (req, res) => {
  if (req.auth!.role !== 'hod') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { classId, startDate, endDate } = req.query as { classId?: string; startDate?: string; endDate?: string };
  if (!classId) return res.status(400).json({ error: 'classId is required' });
  if (startDate && endDate && startDate > endDate) {
    return res.status(400).json({ error: 'Invalid date range' });
  }

  const dateFilter = startDate || endDate
    ? {
        gte: startDate ? new Date(`${startDate}T00:00:00.000Z`) : undefined,
        lt: endDate ? new Date(`${endDate}T23:59:59.999Z`) : undefined,
      }
    : undefined;

  const classRow = await prisma.class.findUnique({
    where: { id: classId },
    include: { students: { include: { user: true }, orderBy: { rollNumber: 'asc' } } },
  });
  if (!classRow) return res.status(404).json({ error: 'Class not found' });

  const records = await prisma.attendanceRecord.findMany({
    where: {
      classId,
      ...(dateFilter ? { attendanceDate: dateFilter } : {}),
    },
  });

  const defaulters = classRow.students
    .map(student => {
      const studentRecords = records.filter(record => record.studentId === student.id);
      const total = studentRecords.length;
      const present = studentRecords.filter(record => record.status === 'present').length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      const riskLevel = pct >= 85 ? 'safe' : pct >= 75 ? 'moderate' : 'high';
      return {
        studentId: student.id,
        rollNumber: student.rollNumber,
        studentName: student.user.name,
        present,
        total,
        pct,
        riskLevel,
      };
    })
    .filter(row => row.total > 0 && row.pct < 75)
    .sort((a, b) => a.pct - b.pct);

  res.json({
    class: { id: classRow.id, name: classRow.name },
    range: { startDate: startDate ?? null, endDate: endDate ?? null },
    defaulters,
  });
});

export default router;


