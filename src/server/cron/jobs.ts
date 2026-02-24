import cron from 'node-cron';
import { prisma } from '../db/client';
import { recomputeAllStudentsAnalytics } from '../analytics/analyticsEngine';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { sendEmail } from '../services/emailService';

function ensureReportsDir() {
  const dir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

async function generateMergedClassReports() {
  const today = new Date();
  const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const classes = await prisma.class.findMany({
    include: { students: { include: { user: true } }, department: true, classTeacher: true },
  });

  const reportsDir = ensureReportsDir();

  for (const cls of classes) {
    const attendance = await prisma.attendanceRecord.findMany({
      where: { classId: cls.id, attendanceDate: dateOnly },
    });
    if (attendance.length === 0) continue;

    const totalStudents = cls.students.length;
    const present = attendance.filter(r => r.status === 'present').length;
    const absent = attendance.filter(r => r.status === 'absent').length;

    const pdfName = `merged-${cls.id}-${dateOnly.toISOString().split('T')[0]}.pdf`;
    const pdfPath = path.join(reportsDir, pdfName);

    await new Promise<void>(resolve => {
      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(pdfPath));

      doc.fontSize(18).text('Daily Merged Attendance Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Class: ${cls.name}`);
      doc.text(`Department: ${cls.department.name}`);
      doc.text(`Date: ${dateOnly.toDateString()}`);
      doc.moveDown();
      doc.text(`Total Students: ${totalStudents}`);
      doc.text(`Present: ${present}`);
      doc.text(`Absent: ${absent}`);
      doc.end();
      doc.on('finish', () => resolve());
    });

    await prisma.mergedClassReport.upsert({
      where: { classId_reportDate: { classId: cls.id, reportDate: dateOnly } },
      update: { totalStudents, totalPresent: present, totalAbsent: absent, pdfPath },
      create: {
        classId: cls.id,
        reportDate: dateOnly,
        totalStudents,
        totalPresent: present,
        totalAbsent: absent,
        pdfPath,
      },
    });

    if (cls.classTeacher?.email) {
      await sendEmail({
        to: cls.classTeacher.email,
        subject: `Merged attendance report for ${cls.name} - ${dateOnly.toDateString()}`,
        text: `Merged attendance for ${cls.name}: Present ${present}, Absent ${absent}.`,
      });
    }
  }
}

export function startCronJobs() {
  // Daily at 23:00
  cron.schedule('0 23 * * *', async () => {
    await generateMergedClassReports();
  });

  // Weekly every Monday at 02:00
  cron.schedule('0 2 * * 1', async () => {
    await recomputeAllStudentsAnalytics();
  });
}

