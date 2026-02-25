import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import {
  getTeacherSubjects,
  getTeacherClassesForSubject,
  getStudentsByClass,
  hasAttendanceForDate,
  markAttendance,
} from '../services/attendanceService.js';
import { recomputeStudentAnalytics } from '../analytics/analyticsEngine.js';
import { prisma } from '../db/client.js';

const router = Router();

router.use(authMiddleware);

router.get('/teacher/subjects', async (req, res) => {
  const userId = req.auth!.userId;
  const subjects = await getTeacherSubjects(userId);
  res.json(subjects);
});

router.get('/teacher/classes', async (req, res) => {
  const userId = req.auth!.userId;
  const subjectId = req.query.subjectId as string;
  if (!subjectId) return res.status(400).json({ error: 'subjectId is required' });
  const classes = await getTeacherClassesForSubject(userId, subjectId);
  res.json(classes);
});

router.get('/classes/:classId/students', async (req, res) => {
  const students = await getStudentsByClass(req.params.classId);
  res.json(
    students.map(s => ({
      id: s.id,
      rollNumber: s.rollNumber,
      name: s.user.name,
      email: s.user.email,
    })),
  );
});

router.get('/attendance/check', async (req, res) => {
  const { classId, subjectId, date } = req.query as {
    classId?: string;
    subjectId?: string;
    date?: string;
  };
  if (!classId || !subjectId || !date) {
    return res.status(400).json({ error: 'classId, subjectId and date are required' });
  }
  const has = await hasAttendanceForDate(classId, subjectId, new Date(date));
  res.json({ exists: has });
});

router.get('/attendance/records', async (req, res) => {
  const { classId, subjectId, date } = req.query as {
    classId?: string;
    subjectId?: string;
    date?: string;
  };
  if (!classId || !subjectId || !date) {
    return res.status(400).json({ error: 'classId, subjectId and date are required' });
  }

  const records = await prisma.attendanceRecord.findMany({
    where: {
      classId,
      subjectId,
      attendanceDate: new Date(date),
    },
    include: {
      student: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json(
    records.map(r => ({
      id: r.id,
      studentId: r.studentId,
      status: r.status,
      studentName: r.student.user.name,
      rollNumber: r.student.rollNumber,
    })),
  );
});

router.get('/attendance/student/:studentId', async (req, res) => {
  const { studentId } = req.params;
  const role = req.auth!.role;
  const userId = req.auth!.userId;

  if (role === 'student') {
    const self = await prisma.student.findUnique({ where: { userId } });
    if (!self || self.id !== studentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { studentId },
    include: {
      subject: true,
      class: true,
    },
    orderBy: { attendanceDate: 'desc' },
  });

  res.json(
    records.map(r => ({
      id: r.id,
      attendanceDate: r.attendanceDate.toISOString().split('T')[0],
      status: r.status,
      subjectId: r.subjectId,
      subjectName: r.subject.name,
      classId: r.classId,
      className: r.class.name,
    })),
  );
});

const markSchema = z.object({
  classId: z.string(),
  subjectId: z.string(),
  date: z.string(),
  attendance: z
    .array(
      z.object({
        studentId: z.string(),
        status: z.enum(['present', 'absent']),
      }),
    )
    .min(1),
});

router.post('/attendance/mark', async (req, res) => {
  const parse = markSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });
  }
  const { classId, subjectId, date, attendance } = parse.data;

  try {
    const created = await markAttendance({
      classId,
      subjectId,
      teacherUserId: req.auth!.userId,
      date: new Date(date),
      attendance: attendance.map(a => ({ studentId: a.studentId, status: a.status })),
    });

    // recompute analytics for affected students
    for (const r of created) {
      // eslint-disable-next-line no-await-in-loop
      await recomputeStudentAnalytics(r.studentId);
    }

    res.status(201).json({ count: created.length });
  } catch (err: any) {
    if (err instanceof Error && err.message.includes('already recorded')) {
      return res.status(409).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

export default router;

