import type { RecoverySimulation } from '@/types/waa';
import { attendanceRecords, analyticsCache, students, subjects, teacherMappings, classes } from '@/data/mockData';

export function getTeacherSubjects(teacherId: string) {
  const mappings = teacherMappings.filter(m => m.teacher_id === teacherId);
  const uniqueSubjectIds = [...new Set(mappings.map(m => m.subject_id))];
  return subjects.filter(s => uniqueSubjectIds.includes(s.id));
}

export function getTeacherClassesForSubject(teacherId: string, subjectId: string) {
  const mappings = teacherMappings.filter(m => m.teacher_id === teacherId && m.subject_id === subjectId);
  const classIds = mappings.map(m => m.class_id);
  return classes.filter(c => classIds.includes(c.id));
}

export function getStudentsByClass(classId: string) {
  return students.filter(s => s.class_id === classId);
}

export function getStudentAnalytics(studentId: string) {
  return analyticsCache.find(a => a.student_id === studentId);
}

export function getClassAnalytics(classId: string) {
  const classStudents = students.filter(s => s.class_id === classId);
  return classStudents.map(s => ({
    student: s,
    analytics: analyticsCache.find(a => a.student_id === s.id),
  }));
}

export function computeRecovery(studentId: string, remainingClasses: number = 30, subjectId?: string): RecoverySimulation {
  const records = attendanceRecords.filter(r =>
    r.student_id === studentId && (!subjectId || r.subject_id === subjectId),
  );
  const totalConducted = records.length;
  const totalAttended = records.filter(r => r.status === 'present').length;
  const currentPct = totalConducted > 0 ? (totalAttended / totalConducted) * 100 : 100;

  const calcNeeded = (target: number) => {
    // (totalAttended + x) / (totalConducted + remainingClasses) >= target/100
    const needed = Math.ceil((target / 100) * (totalConducted + remainingClasses) - totalAttended);
    return Math.max(0, needed);
  };

  const needed75 = calcNeeded(75);
  const needed85 = calcNeeded(85);

  return {
    totalConducted,
    totalAttended,
    remainingClasses,
    currentPct: Math.round(currentPct),
    classesNeededFor75: needed75,
    classesNeededFor85: needed85,
    canReach75: needed75 <= remainingClasses,
    canReach85: needed85 <= remainingClasses,
  };
}

export function hasAttendanceForDate(classId: string, subjectId: string, date: string): boolean {
  return attendanceRecords.some(
    r => r.class_id === classId && r.subject_id === subjectId && r.attendance_date === date
  );
}

export function getAttendanceTrend(studentId: string): { date: string; pct: number }[] {
  const records = attendanceRecords.filter(r => r.student_id === studentId);
  const byDate = new Map<string, { total: number; present: number }>();
  records.forEach(r => {
    const entry = byDate.get(r.attendance_date) || { total: 0, present: 0 };
    entry.total++;
    if (r.status === 'present') entry.present++;
    byDate.set(r.attendance_date, entry);
  });

  // Cumulative
  let cumTotal = 0, cumPresent = 0;
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { total, present }]) => {
      cumTotal += total;
      cumPresent += present;
      return { date, pct: Math.round((cumPresent / cumTotal) * 100) };
    });
}

export function getRiskDistribution(classId?: string) {
  const relevantStudents = classId
    ? students.filter(s => s.class_id === classId)
    : students;
  
  let safe = 0, moderate = 0, high = 0;
  for (const s of relevantStudents) {
    const a = analyticsCache.find(ac => ac.student_id === s.id);
    if (!a || a.risk_level === 'safe') safe++;
    else if (a.risk_level === 'moderate') moderate++;
    else high++;
  }
  return { safe, moderate, high, total: relevantStudents.length };
}
