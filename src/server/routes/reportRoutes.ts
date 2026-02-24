import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { prisma } from '../db/client';
import PDFDocument from 'pdfkit';

const router = Router();

router.use(authMiddleware);

router.get('/student/:studentId', async (req, res) => {
  const { studentId } = req.params;
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
  requireRole('class_teacher', 'hod'),
  async (req, res) => {
    const { classId } = req.params;
    const reports = await prisma.mergedClassReport.findMany({
      where: { classId },
      orderBy: { reportDate: 'desc' },
      take: 30,
    });
    res.json(reports);
  },
);

router.get('/class/:classId/merged/:reportId/pdf', async (req, res) => {
  const { reportId } = req.params;
  const report = await prisma.mergedClassReport.findUnique({
    where: { id: reportId },
    include: { class: true },
  });
  if (!report) return res.status(404).send('Report not found');

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

