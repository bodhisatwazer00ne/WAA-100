import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import PDFDocument from 'pdfkit';
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

function dateOnly(input: string) {
  return new Date(`${input}T00:00:00.000Z`);
}

function nextDate(input: string) {
  const d = dateOnly(input);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function dateKey(input: Date) {
  return input.toISOString().split('T')[0];
}

function toRisk(pct: number): 'safe' | 'moderate' | 'high' {
  if (pct >= 85) return 'safe';
  if (pct >= 75) return 'moderate';
  return 'high';
}

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
    const studentProfile = await prisma.student.findUnique({ where: { id: studentId } });
    if (!studentProfile) return res.status(404).send('Student not found');
    const allowed = await canAccessClass(userId, role, studentProfile.classId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true, class: true },
  });
  if (!student) return res.status(404).send('Student not found');

  const attendance = await prisma.attendanceRecord.findMany({
    where: { studentId },
    include: { subject: true },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="student-${student.rollNumber}-attendance.pdf"`,
  );

  const doc = new PDFDocument();
  doc.pipe(res);

  doc.fontSize(18).text('Student Attendance Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Name: ${student.user.name}`);
  doc.text(`Roll No: ${student.rollNumber}`);
  doc.text(`Class: ${student.class.name}`);
  doc.moveDown();

  const bySubject = new Map<string, { name: string; present: number; total: number }>();
  for (const r of attendance) {
    const key = r.subjectId;
    const cur =
      bySubject.get(key) ?? { name: r.subject.name, present: 0, total: 0 };
    cur.total += 1;
    if (r.status === 'present') cur.present += 1;
    bySubject.set(key, cur);
  }

  for (const subj of bySubject.values()) {
    const pct = subj.total === 0 ? 100 : (subj.present / subj.total) * 100;
    doc.text(
      `${subj.name}: ${subj.present}/${subj.total} (${pct.toFixed(2)}%)`,
    );
  }

  doc.end();
});

router.get(
  '/class/:classId/merged',
  requireRole('teacher', 'class_teacher', 'hod'),
  async (req, res) => {
    const { classId } = req.params;
    const allowed = await canAccessClass(req.auth!.userId, req.auth!.role, classId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const reports = await prisma.mergedClassReport.findMany({
      where: { classId },
      orderBy: { reportDate: 'desc' },
      take: 30,
    });
    res.json(reports);
  },
);

router.get('/my-class', requireRole('teacher', 'class_teacher', 'hod'), async (req, res) => {
  const classRow = await prisma.class.findFirst({
    where: { classTeacherId: req.auth!.userId },
    include: {
      students: true,
    },
  });

  if (!classRow) {
    return res.status(404).json({ error: 'No class assigned as class teacher' });
  }

  return res.json({
    id: classRow.id,
    name: classRow.name,
    semester: classRow.semester,
    totalStudents: classRow.students.length,
  });
});

router.get('/my-class/report-dates', requireRole('teacher', 'class_teacher', 'hod'), async (req, res) => {
  const classRow = await prisma.class.findFirst({
    where: { classTeacherId: req.auth!.userId },
  });

  if (!classRow) {
    return res.status(404).json({ error: 'No class assigned as class teacher' });
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { classId: classRow.id },
    select: { attendanceDate: true },
    orderBy: { attendanceDate: 'asc' },
  });

  const uniqueDates = Array.from(new Set(records.map(r => dateKey(r.attendanceDate))));
  return res.json(uniqueDates);
});

router.get('/my-class/single-day', requireRole('teacher', 'class_teacher', 'hod'), async (req, res) => {
  const { date } = req.query as { date?: string };
  if (!date) return res.status(400).json({ error: 'date is required' });

  const classRow = await prisma.class.findFirst({
    where: { classTeacherId: req.auth!.userId },
    include: {
      students: {
        include: { user: true },
        orderBy: { rollNumber: 'asc' },
      },
    },
  });
  if (!classRow) {
    return res.status(404).json({ error: 'No class assigned as class teacher' });
  }

  const records = await prisma.attendanceRecord.findMany({
    where: {
      classId: classRow.id,
      attendanceDate: { gte: dateOnly(date), lt: nextDate(date) },
    },
    include: {
      subject: true,
      student: { include: { user: true } },
    },
  });

  const subjectIds = Array.from(new Set(records.map(r => r.subjectId)));
  const subjects = subjectIds
    .map(subjectId => {
      const subjectName = records.find(r => r.subjectId === subjectId)?.subject.name ?? subjectId;
      return { id: subjectId, name: subjectName };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const subjectBreakdown = subjects.map(subject => {
    const subjectRecords = records.filter(r => r.subjectId === subject.id);
    const present = subjectRecords.filter(r => r.status === 'present').length;
    const absent = subjectRecords.length - present;
    const percentage = subjectRecords.length ? Math.round((present / subjectRecords.length) * 100) : 0;
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      present,
      absent,
      percentage,
    };
  });

  const matrixRows = classRow.students.map(student => {
    const statuses = subjects.map(subject => {
      const record = records.find(r => r.studentId === student.id && r.subjectId === subject.id);
      if (!record) return '-';
      return record.status === 'present' ? 'P' : 'A';
    });
    return {
      studentId: student.id,
      rollNumber: student.rollNumber,
      studentName: student.user.name,
      statuses,
    };
  });

  const totalStudents = classRow.students.length;
  const totalSubjects = subjects.length;
  const totalEntries = totalStudents * totalSubjects;
  const totalPresent = records.filter(r => r.status === 'present').length;
  const totalAbsent = records.filter(r => r.status === 'absent').length;
  const avgAttendancePct = totalEntries > 0 ? Math.round((totalPresent / totalEntries) * 100) : 0;

  return res.json({
    class: { id: classRow.id, name: classRow.name },
    date,
    totalStudents,
    totalSubjects,
    totalPresent,
    totalAbsent,
    avgAttendancePct,
    subjects,
    subjectBreakdown,
    matrixRows,
  });
});

router.get('/my-class/range-stats', requireRole('teacher', 'class_teacher', 'hod'), async (req, res) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  if (startDate && endDate && startDate > endDate) {
    return res.status(400).json({ error: 'Invalid date range' });
  }

  const classRow = await prisma.class.findFirst({
    where: { classTeacherId: req.auth!.userId },
    include: {
      students: { include: { user: true }, orderBy: { rollNumber: 'asc' } },
    },
  });
  if (!classRow) {
    return res.status(404).json({ error: 'No class assigned as class teacher' });
  }

  const dateFilter = startDate || endDate
    ? {
        gte: startDate ? dateOnly(startDate) : undefined,
        lt: endDate ? nextDate(endDate) : undefined,
      }
    : undefined;

  const records = await prisma.attendanceRecord.findMany({
    where: {
      classId: classRow.id,
      attendanceDate: dateFilter,
    },
  });

  const studentRows = classRow.students.map(student => {
    const studentRecords = records.filter(r => r.studentId === student.id);
    const total = studentRecords.length;
    const present = studentRecords.filter(r => r.status === 'present').length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    const risk = toRisk(pct);
    const status = total === 0 ? 'No Data' : pct < 75 ? 'Defaulter' : 'Not Defaulter';
    return {
      studentId: student.id,
      rollNumber: student.rollNumber,
      studentName: student.user.name,
      total,
      present,
      pct,
      risk,
      status,
    };
  });

  const assessed = studentRows.filter(r => r.status !== 'No Data');
  const defaulters = assessed.filter(r => r.status === 'Defaulter');
  const nonDefaulters = assessed.filter(r => r.status === 'Not Defaulter');
  const safe = assessed.filter(r => r.risk === 'safe');

  return res.json({
    class: { id: classRow.id, name: classRow.name },
    range: { startDate: startDate ?? null, endDate: endDate ?? null },
    totals: {
      assessed: assessed.length,
      safe: safe.length,
      defaulters: defaulters.length,
      nonDefaulters: nonDefaulters.length,
    },
    studentRows,
  });
});

router.get('/teacher-defaulters', requireRole('teacher', 'class_teacher', 'hod'), async (req, res) => {
  const { subjectId, classId } = req.query as { subjectId?: string; classId?: string };
  if (!subjectId || !classId) {
    return res.status(400).json({ error: 'subjectId and classId are required' });
  }

  const teacher = await prisma.teacher.findUnique({ where: { userId: req.auth!.userId } });
  if (!teacher) return res.status(403).json({ error: 'Teacher profile not found' });

  const mapping = await prisma.teacherClassSubject.findFirst({
    where: {
      teacherId: teacher.id,
      subjectId,
      classId,
    },
  });
  if (!mapping) {
    return res.status(403).json({ error: 'You are not assigned to this class and subject' });
  }

  const [classRow, subject, classStudents, subjectRecords] = await Promise.all([
    prisma.class.findUnique({ where: { id: classId } }),
    prisma.subject.findUnique({ where: { id: subjectId } }),
    prisma.student.findMany({
      where: { classId },
      include: { user: true },
      orderBy: { rollNumber: 'asc' },
    }),
    prisma.attendanceRecord.findMany({
      where: { classId, subjectId },
    }),
  ]);

  const rows = classStudents
    .map(student => {
      const records = subjectRecords.filter(r => r.studentId === student.id);
      const total = records.length;
      const present = records.filter(r => r.status === 'present').length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        studentId: student.id,
        rollNumber: student.rollNumber,
        studentName: student.user.name,
        total,
        present,
        pct,
      };
    })
    .filter(row => row.total > 0 && row.pct < 75)
    .sort((a, b) => a.pct - b.pct);

  return res.json({
    class: classRow ? { id: classRow.id, name: classRow.name } : null,
    subject: subject ? { id: subject.id, code: subject.code, name: subject.name } : null,
    defaulters: rows,
  });
});

router.get('/faculty-mapping', requireRole('hod'), async (_req, res) => {
  const teachers = await prisma.teacher.findMany({
    include: {
      user: {
        include: {
          classesAsClassTeacher: true,
        },
      },
      classesTaught: {
        include: {
          subject: true,
          class: true,
        },
      },
    },
    orderBy: { user: { name: 'asc' } },
  });

  const attendance = await prisma.attendanceRecord.findMany({
    where: {
      teacherId: { in: teachers.map(t => t.id) },
    },
    select: {
      teacherId: true,
      classId: true,
      subjectId: true,
      attendanceDate: true,
    },
  });

  const sessionsByTeacher = new Map<string, number>();
  for (const teacher of teachers) {
    const keys = new Set(
      attendance
        .filter(record => record.teacherId === teacher.id)
        .map(
          record =>
            `${record.classId}-${record.subjectId}-${record.attendanceDate.toISOString().split('T')[0]}`,
        ),
    );
    sessionsByTeacher.set(teacher.id, keys.size);
  }

  const rows = teachers.map(teacher => ({
    teacherId: teacher.user.id,
    teacherProfileId: teacher.id,
    name: teacher.user.name,
    email: teacher.user.email,
    role: teacher.user.role,
    subjects: Array.from(new Set(teacher.classesTaught.map(mapping => mapping.subject.name))),
    classes: Array.from(new Set(teacher.classesTaught.map(mapping => mapping.class.name))),
    classTeacherOf: teacher.user.classesAsClassTeacher.map(classRow => classRow.name),
    sessions: sessionsByTeacher.get(teacher.id) ?? 0,
  }));

  return res.json(rows);
});

router.get('/class/:classId/merged/:reportId/pdf', requireRole('teacher', 'class_teacher', 'hod'), async (req, res) => {
  const { reportId } = req.params;
  const report = await prisma.mergedClassReport.findUnique({
    where: { id: reportId },
    include: { class: true },
  });
  if (!report) return res.status(404).send('Report not found');
  const allowed = await canAccessClass(req.auth!.userId, req.auth!.role, report.classId);
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="merged-${report.class.name}-${report.reportDate
      .toISOString()
      .split('T')[0]}.pdf"`,
  );

  const doc = new PDFDocument();
  doc.pipe(res);

  doc.fontSize(18).text('Daily Merged Attendance Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Class: ${report.class.name}`);
  doc.text(`Date: ${report.reportDate.toDateString()}`);
  doc.moveDown();
  doc.text(`Total Students: ${report.totalStudents}`);
  doc.text(`Present: ${report.totalPresent}`);
  doc.text(`Absent: ${report.totalAbsent}`);

  doc.end();
});

export default router;


