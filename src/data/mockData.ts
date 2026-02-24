import type {
  User,
  Department,
  Class,
  Subject,
  TeacherSubjectMapping,
  Student,
  AttendanceRecord,
  AnalyticsCache,
  Notification,
  MergedClassReport,
  AuditLog,
  RiskLevel,
} from '@/types/waa';

const ATTENDANCE_STORAGE_KEY = 'waa100_attendance_records_v2';
const ANALYTICS_STORAGE_KEY = 'waa100_analytics_cache_v2';

function loadFromStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / JSON errors for now
  }
}

// --- Departments ---
export const departments: Department[] = [
  { id: 'dept-1', name: 'Computer Science & Engineering', code: 'CSE', hod_id: 'user-hod-1' },
  { id: 'dept-2', name: 'Electronics & Communication', code: 'ECE', hod_id: 'user-hod-2' },
];

// --- Users ---
export const users: User[] = [
  { id: 'user-hod-1', name: 'Rahul Gaikwad', email: 'rahul.gaikwad@university.edu', role: 'hod', department_id: 'dept-1' },

  // Teachers who are also class teachers by class assignment
  { id: 'user-ct-1', name: 'Prof. Prakash Mali', email: 'prakash.mali@university.edu', role: 'teacher', department_id: 'dept-1' },
  { id: 'user-ct-2', name: 'Prof. Preeti Raut', email: 'preeti.raut@university.edu', role: 'teacher', department_id: 'dept-1' },
  { id: 'user-ct-3', name: 'Prof. Vijay Mane', email: 'vijay.mane@university.edu', role: 'teacher', department_id: 'dept-1' },
  { id: 'user-ct-4', name: 'Prof. Sonali Matondkar', email: 'sonali.matondkar@university.edu', role: 'teacher', department_id: 'dept-1' },

  // A dedicated teacher account (non class-teacher)
  { id: 'user-t-1', name: 'Prof. Rahul Joshi', email: 'rahul.joshi@university.edu', role: 'teacher', department_id: 'dept-1' },

  // Student login accounts (2 from each class)
  { id: 'user-s-tya-1', name: 'Aarav Patil', email: 'aarav.patil@student.edu', role: 'student', department_id: 'dept-1' },
  { id: 'user-s-tya-2', name: 'Rohan Kulkarni', email: 'rohan.kulkarni@student.edu', role: 'student', department_id: 'dept-1' },
  { id: 'user-s-tyb-1', name: 'Aditi Kulkarni', email: 'aditi.kulkarni@student.edu', role: 'student', department_id: 'dept-1' },
  { id: 'user-s-tyb-2', name: 'Sneha Patil', email: 'sneha.patil@student.edu', role: 'student', department_id: 'dept-1' },
  { id: 'user-s-sya-1', name: 'Arjun Malhotra', email: 'arjun.malhotra@student.edu', role: 'student', department_id: 'dept-1' },
  { id: 'user-s-sya-2', name: 'Devansh Verma', email: 'devansh.verma@student.edu', role: 'student', department_id: 'dept-1' },
  { id: 'user-s-syb-1', name: 'Ananya Malhotra', email: 'ananya.malhotra@student.edu', role: 'student', department_id: 'dept-1' },
  { id: 'user-s-syb-2', name: 'Kavya Verma', email: 'kavya.verma@student.edu', role: 'student', department_id: 'dept-1' },
];

// --- Classes ---
export const classes: Class[] = [
  { id: 'class-ty-a', name: 'TY.CSE A', department_id: 'dept-1', class_teacher_id: 'user-ct-1', semester: 5 },
  { id: 'class-ty-b', name: 'TY.CSE B', department_id: 'dept-1', class_teacher_id: 'user-ct-4', semester: 5 },
  { id: 'class-sy-a', name: 'SY.CSE A', department_id: 'dept-1', class_teacher_id: 'user-ct-3', semester: 3 },
  { id: 'class-sy-b', name: 'SY.CSE B', department_id: 'dept-1', class_teacher_id: 'user-ct-2', semester: 3 },
];

// --- Subjects ---
export const subjects: Subject[] = [
  { id: 'sub-iot', name: 'Internet of Things', code: 'CS341', department_id: 'dept-1' },
  { id: 'sub-dmkt', name: 'Digital Marketing', code: 'CS342', department_id: 'dept-1' },
  { id: 'sub-pe', name: 'Professional Ethics', code: 'CS543', department_id: 'dept-1' },
  { id: 'sub-os', name: 'Operating Systems', code: 'CS303', department_id: 'dept-1' },
  { id: 'sub-cn', name: 'Computer Networks', code: 'CS344', department_id: 'dept-1' },
  { id: 'sub-se', name: 'Software Engineering', code: 'CS345', department_id: 'dept-1' },
];

// --- Teacher-Subject-Class Mapping ---
export const teacherMappings: TeacherSubjectMapping[] = [
  // Prof. Prakash Mali: CN to TY.CSE A and TY.CSE B
  { teacher_id: 'user-ct-1', subject_id: 'sub-cn', class_id: 'class-ty-a' },
  { teacher_id: 'user-ct-1', subject_id: 'sub-cn', class_id: 'class-ty-b' },

  // Prof. Preeti Raut: Software Engineering to SY.CSE A and SY.CSE B
  { teacher_id: 'user-ct-2', subject_id: 'sub-se', class_id: 'class-sy-a' },
  { teacher_id: 'user-ct-2', subject_id: 'sub-se', class_id: 'class-sy-b' },

  // Prof. Vijay Mane: IoT to SY.CSE A and SY.CSE B
  { teacher_id: 'user-ct-3', subject_id: 'sub-iot', class_id: 'class-sy-a' },
  { teacher_id: 'user-ct-3', subject_id: 'sub-iot', class_id: 'class-sy-b' },

  // Prof. Sonali Matondkar: DM to SY classes, PE to TY classes
  { teacher_id: 'user-ct-4', subject_id: 'sub-dmkt', class_id: 'class-sy-a' },
  { teacher_id: 'user-ct-4', subject_id: 'sub-dmkt', class_id: 'class-sy-b' },
  { teacher_id: 'user-ct-4', subject_id: 'sub-pe', class_id: 'class-ty-a' },
  { teacher_id: 'user-ct-4', subject_id: 'sub-pe', class_id: 'class-ty-b' },

  // Generic teacher mapping for teacher role demo
  { teacher_id: 'user-t-1', subject_id: 'sub-os', class_id: 'class-ty-a' },
  { teacher_id: 'user-t-1', subject_id: 'sub-os', class_id: 'class-ty-b' },
];

const tyAStudents = [
  'Aarav Patil',
  'Rohan Kulkarni',
  'Aditya Deshmukh',
  'Sarthak Joshi',
  'Omkar Jadhav',
  'Kunal Pawar',
  'Shubham More',
  'Siddharth Gokhale',
  'Pranav Chavan',
  'Nikhil Bhosale',
  'Akash Shinde',
  'Vaibhav Sawant',
  'Yash Kulkarni',
  'Atharva Patwardhan',
  'Tejas Mahajan',
  'Harshad Kale',
  'Aniket Patil',
  'Abhishek Naik',
  'Rohit Shelar',
  'Mayur Phadke',
];

const tyBStudents = [
  'Aditi Kulkarni',
  'Sneha Patil',
  'Pooja Deshmukh',
  'Rutuja Joshi',
  'Neha Jadhav',
  'Sakshi Pawar',
  'Tanvi More',
  'Isha Gokhale',
  'Priya Chavan',
  'Ankita Bhosale',
  'Shreya Shinde',
  'Pallavi Sawant',
  'Komal Kulkarni',
  'Sayali Patwardhan',
  'Nandini Mahajan',
  'Megha Kale',
  'Prajakta Patil',
  'Riya Naik',
  'Kiran Shelar',
  'Mitali Phadke',
];

const syAStudents = [
  'Arjun Malhotra', 'Devansh Verma', 'Ishaan Mehta', 'Karthik Iyer', 'Manav Shah',
  'Ritesh Agarwal', 'Mohit Singhania', 'Ayush Gupta', 'Lakshya Bansal', 'Raghav Choudhary',
  'Naman Goel', 'Siddhant Arora', 'Varun Khanna', 'Aakash Mittal', 'Tushar Jain',
  'Rohit Saxena', 'Piyush Srivastava', 'Kunal Mathur', 'Abhinav Mishra', 'Anshul Tripathi',
];

const syBStudents = [
  'Ananya Malhotra', 'Kavya Verma', 'Riya Mehta', 'Nisha Iyer', 'Palak Shah',
  'Simran Agarwal', 'Muskan Singhania', 'Aayushi Gupta', 'Kritika Bansal', 'Shreya Choudhary',
  'Neha Goel', 'Tanya Arora', 'Pooja Khanna', 'Aditi Mittal', 'Sakshi Jain',
  'Sonal Saxena', 'Nikita Srivastava', 'Ishita Mathur', 'Bhavya Mishra', 'Rachna Tripathi',
];

function createClassStudents(
  list: string[],
  classId: string,
  idPrefix: string,
  rollPrefix: string,
  userPrefix: string,
  firstTwoUsers?: string[],
): Student[] {
  return list.map((name, i) => {
    const userId = firstTwoUsers && i < 2 ? firstTwoUsers[i] : `${userPrefix}-${i + 1}`;
    const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '');
    return {
      id: `${idPrefix}-${i + 1}`,
      user_id: userId,
      name,
      roll_number: `${rollPrefix}${String(i + 1).padStart(3, '0')}`,
      class_id: classId,
      email: `${safe}@student.edu`,
    };
  });
}

// --- Students ---
export const students: Student[] = [
  ...createClassStudents(tyAStudents, 'class-ty-a', 'stu-tya', 'TYCSEA', 'anon-tya', ['user-s-tya-1', 'user-s-tya-2']),
  ...createClassStudents(tyBStudents, 'class-ty-b', 'stu-tyb', 'TYCSEB', 'anon-tyb', ['user-s-tyb-1', 'user-s-tyb-2']),
  ...createClassStudents(syAStudents, 'class-sy-a', 'stu-sya', 'SYCSEA', 'anon-sya', ['user-s-sya-1', 'user-s-sya-2']),
  ...createClassStudents(syBStudents, 'class-sy-b', 'stu-syb', 'SYCSEB', 'anon-syb', ['user-s-syb-1', 'user-s-syb-2']),
];

// --- Generate realistic attendance records ---
function generateAttendanceRecords(): AttendanceRecord[] {
  return [];
}

const persistedAttendance = loadFromStorage<AttendanceRecord[]>(ATTENDANCE_STORAGE_KEY);

export const attendanceRecords: AttendanceRecord[] =
  persistedAttendance ?? generateAttendanceRecords();

if (!persistedAttendance) {
  saveToStorage(ATTENDANCE_STORAGE_KEY, attendanceRecords);
}

// --- Compute analytics from records ---
function computeAnalytics(): AnalyticsCache[] {
  const result: AnalyticsCache[] = [];

  for (const stu of students) {
    const stuRecords = attendanceRecords.filter(r => r.student_id === stu.id);
    if (stuRecords.length === 0) {
      result.push({
        student_id: stu.id,
        overall_pct: 100,
        subject_wise: [],
        risk_level: 'safe',
        weekly_avg: 100,
        trend: 0,
        updated_at: new Date().toISOString(),
      });
      continue;
    }

    const present = stuRecords.filter(r => r.status === 'present').length;
    const overall = (present / stuRecords.length) * 100;

    const subjectMap = new Map<string, { attended: number; total: number }>();
    for (const r of stuRecords) {
      const entry = subjectMap.get(r.subject_id) || { attended: 0, total: 0 };
      entry.total++;
      if (r.status === 'present') entry.attended++;
      subjectMap.set(r.subject_id, entry);
    }

    const subjectWise = Array.from(subjectMap.entries()).map(([subId, data]) => {
      const sub = subjects.find(s => s.id === subId);
      return {
        subject_id: subId,
        subject_name: sub?.name || subId,
        pct: Math.round((data.attended / data.total) * 100),
        attended: data.attended,
        total: data.total,
      };
    });

    const risk: RiskLevel = overall >= 85 ? 'safe' : overall >= 75 ? 'moderate' : 'high';

    const mid = Math.floor(stuRecords.length / 2);
    const firstHalfTotal = Math.max(mid, 1);
    const secondHalfTotal = Math.max(stuRecords.length - mid, 1);
    const firstHalf = stuRecords.slice(0, mid).filter(r => r.status === 'present').length / firstHalfTotal;
    const secondHalf = stuRecords.slice(mid).filter(r => r.status === 'present').length / secondHalfTotal;
    const trend = Math.round((secondHalf - firstHalf) * 100);

    result.push({
      student_id: stu.id,
      overall_pct: Math.round(overall),
      subject_wise: subjectWise,
      risk_level: risk,
      weekly_avg: Math.round(overall),
      trend,
      updated_at: new Date().toISOString(),
    });
  }

  return result;
}

const persistedAnalytics = loadFromStorage<AnalyticsCache[]>(ANALYTICS_STORAGE_KEY);

export const analyticsCache: AnalyticsCache[] =
  persistedAnalytics ?? computeAnalytics();

if (!persistedAnalytics) {
  saveToStorage(ANALYTICS_STORAGE_KEY, analyticsCache);
}

// When attendance changes at runtime, recompute analytics & persist both.
export function recomputeAnalyticsCache() {
  const updated = computeAnalytics();
  analyticsCache.splice(0, analyticsCache.length, ...updated);
  saveToStorage(ANALYTICS_STORAGE_KEY, analyticsCache);
}

export function persistAttendanceRecords() {
  saveToStorage(ATTENDANCE_STORAGE_KEY, attendanceRecords);
}

// --- Notifications ---
function generateNotifications(): Notification[] {
  const notifs: Notification[] = [];
  const absences = attendanceRecords.filter(r => r.status === 'absent').slice(-20);

  absences.forEach((a, i) => {
    const sub = subjects.find(s => s.id === a.subject_id);
    const stu = students.find(s => s.id === a.student_id);
    notifs.push({
      id: `notif-${i + 1}`,
      student_id: a.student_id,
      type: 'absence',
      message: `${stu?.name} was absent in ${sub?.name} on ${a.attendance_date}`,
      read: i < 10,
      created_at: a.created_at,
    });
  });

  return notifs;
}

export const notifications: Notification[] = generateNotifications();

// --- Merged Reports ---
function buildMergedReport(classId: string, date: string): MergedClassReport {
  const classRecords = attendanceRecords.filter(r => r.class_id === classId && r.attendance_date === date);
  const classStudents = students.filter(s => s.class_id === classId);
  const classSubjectIds = [...new Set(classRecords.map(r => r.subject_id))];

  const subjectBreakdown = classSubjectIds.map(subjectId => {
    const recs = classRecords.filter(r => r.subject_id === subjectId);
    const present = recs.filter(r => r.status === 'present').length;
    const subject = subjects.find(s => s.id === subjectId);
    return {
      subject_id: subjectId,
      subject_name: subject?.name || subjectId,
      present,
      absent: recs.length - present,
      total: recs.length,
      percentage: recs.length > 0 ? Math.round((present / recs.length) * 100) : 0,
    };
  });

  const avg = subjectBreakdown.length > 0
    ? Math.round(subjectBreakdown.reduce((sum, s) => sum + s.percentage, 0) / subjectBreakdown.length)
    : 0;

  return {
    id: `mr-${classId}-${date}`,
    class_id: classId,
    report_date: date,
    total_students: classStudents.length,
    total_subjects: classSubjectIds.length,
    avg_attendance_pct: avg,
    subject_breakdown: subjectBreakdown,
    generated_at: `${date}T18:00:00Z`,
  };
}

export function getMergedReports(): MergedClassReport[] {
  const reportDates = [...new Set(attendanceRecords.map(r => r.attendance_date))].sort();
  return classes.flatMap(c => reportDates.map(date => buildMergedReport(c.id, date)));
}

// Backward-compatible snapshot export; prefer getMergedReports() for fresh data.
export const mergedReports: MergedClassReport[] = getMergedReports();

export const auditLogs: AuditLog[] = [
  {
    id: 'audit-1',
    action: 'attendance_override',
    performed_by: 'user-ct-2',
    target_record_id: 'att-15',
    reason: 'Student had medical certificate',
    timestamp: '2026-02-10T14:30:00Z',
  },
];
