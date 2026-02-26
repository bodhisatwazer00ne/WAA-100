import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../core/middleware/auth.js';
import {
  getTeacherSubjects,
  getTeacherClassesForSubject,
  getStudentsByClass,
  hasAttendanceForDate,
  markAttendance,
} from './attendanceService.js';
import { recomputeStudentAnalytics } from '../analytics/analyticsEngine.js';
import { prisma } from '../../core/db/client.js';

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

const overrideSchema = z.object({
  studentId: z.string(),
  date: z.string(),
  reason: z.string().min(3),
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

router.post('/attendance/override', async (req, res) => {
  const parse = overrideSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });
  }

  const { studentId, date, reason } = parse.data;
  const actorUserId = req.auth!.userId;
  const role = req.auth!.role;
  if (role !== 'teacher' && role !== 'class_teacher' && role !== 'hod') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  if (role !== 'hod') {
    const assignedClass = await prisma.class.findFirst({
      where: { classTeacherId: actorUserId },
      select: { id: true },
    });
    if (!assignedClass || assignedClass.id !== student.classId) {
      return res.status(403).json({ error: 'You can only override attendance for your class' });
    }
  }

  const targetDate = new Date(`${date}T00:00:00.000Z`);
  const nextDate = new Date(targetDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  const absentRecords = await prisma.attendanceRecord.findMany({
    where: {
      studentId,
      status: 'absent',
      attendanceDate: {
        gte: targetDate,
        lt: nextDate,
      },
    },
  });

  if (absentRecords.length === 0) {
    return res.status(404).json({ error: 'No absence records found for this student on this date' });
  }

  await prisma.$transaction(async tx => {
    for (const record of absentRecords) {
      // eslint-disable-next-line no-await-in-loop
      await tx.attendanceRecord.update({
        where: { id: record.id },
        data: {
          status: 'present',
          overrideReason: reason,
        },
      });

      // eslint-disable-next-line no-await-in-loop
      await tx.auditLog.create({
        data: {
          attendanceRecordId: record.id,
          actorUserId,
          previousStatus: 'absent',
          newStatus: 'present',
          reason,
        },
      });
    }
  });

  await recomputeStudentAnalytics(studentId);
  return res.json({ overriddenCount: absentRecords.length });
});

export default router;


