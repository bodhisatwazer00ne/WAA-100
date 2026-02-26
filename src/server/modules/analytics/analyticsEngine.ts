import { prisma } from '../../core/db/client.js';

export async function recomputeStudentAnalytics(studentId: string) {
  const records = await prisma.attendanceRecord.findMany({
    where: { studentId },
    orderBy: { attendanceDate: 'asc' },
    include: { subject: true },
  });

  if (records.length === 0) {
    await prisma.analyticsCache.upsert({
      where: { studentId },
      update: {
        overallPct: 100,
        subjectWise: [],
        rateOfDecline: 0,
        acceleration: 0,
        variance: 0,
        weeklyAvg: 100,
        termAvg: 100,
        riskLevel: 'safe',
        lastComputedAt: new Date(),
      },
      create: {
        studentId,
        overallPct: 100,
        subjectWise: [],
        rateOfDecline: 0,
        acceleration: 0,
        variance: 0,
        weeklyAvg: 100,
        termAvg: 100,
        riskLevel: 'safe',
      },
    });
    return;
  }

  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const overallPct = (present / total) * 100;

  const bySubject = new Map<
    string,
    { subjectId: string; subjectName: string; attended: number; total: number }
  >();

  for (const r of records) {
    const key = r.subjectId;
    const current =
      bySubject.get(key) ?? {
        subjectId: r.subjectId,
        subjectName: r.subject.name,
        attended: 0,
        total: 0,
      };
    current.total += 1;
    if (r.status === 'present') current.attended += 1;
    bySubject.set(key, current);
  }

  const subjectWise = Array.from(bySubject.values()).map(s => ({
    ...s,
    pct: s.total === 0 ? 100 : (s.attended / s.total) * 100,
  }));

  // Simple trend approximation: last 5 points
  const lastN = 5;
  const lastRecords = records.slice(-lastN);
  const points = lastRecords.map((r, idx) => ({
    x: idx + 1,
    y:
      ((lastRecords.slice(0, idx + 1).filter(rr => rr.status === 'present').length) /
        (idx + 1)) *
      100,
  }));

  const n = points.length;
  let rateOfDecline = 0;
  let acceleration = 0;
  let variance = 0;

  if (n >= 2) {
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    rateOfDecline = slope;

    // Approximate acceleration as difference between last two slopes
    if (n >= 3) {
      const firstHalf = points.slice(0, Math.floor(n / 2));
      const secondHalf = points.slice(Math.floor(n / 2));
      const slopeHalf = (pts: typeof points) => {
        const nn = pts.length;
        const sx = pts.reduce((s, p) => s + p.x, 0);
        const sy = pts.reduce((s, p) => s + p.y, 0);
        const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
        const sx2 = pts.reduce((s, p) => s + p.x * p.x, 0);
        return (nn * sxy - sx * sy) / (nn * sx2 - sx * sx || 1);
      };
      acceleration = slopeHalf(secondHalf) - slopeHalf(firstHalf);
    }

    const meanY = sumY / n;
    variance =
      points.reduce((s, p) => s + (p.y - meanY) * (p.y - meanY), 0) / (n - 1 || 1);
  }

  // Weekly & term averages (simplified using same overallPct)
  const weeklyAvg = overallPct;
  const termAvg = overallPct;

  let riskLevel: 'safe' | 'moderate' | 'high';
  if (overallPct >= 85) riskLevel = 'safe';
  else if (overallPct >= 75) riskLevel = 'moderate';
  else riskLevel = 'high';

  await prisma.analyticsCache.upsert({
    where: { studentId },
    update: {
      overallPct,
      subjectWise,
      rateOfDecline,
      acceleration,
      variance,
      weeklyAvg,
      termAvg,
      riskLevel,
      lastComputedAt: new Date(),
    },
    create: {
      studentId,
      overallPct,
      subjectWise,
      rateOfDecline,
      acceleration,
      variance,
      weeklyAvg,
      termAvg,
      riskLevel,
    },
  });
}

export async function recomputeAllStudentsAnalytics() {
  const students = await prisma.student.findMany({ select: { id: true } });
  for (const s of students) {
    // eslint-disable-next-line no-await-in-loop
    await recomputeStudentAnalytics(s.id);
  }
}



