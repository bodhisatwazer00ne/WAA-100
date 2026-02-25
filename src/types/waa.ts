// WAA-100 Core Types

export type UserRole = 'teacher' | 'class_teacher' | 'hod' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department_id: string;
  profile_id?: string;
  avatar?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  hod_id: string;
}

export interface Class {
  id: string;
  name: string;
  department_id: string;
  class_teacher_id: string;
  semester: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  department_id: string;
}

export interface TeacherSubjectMapping {
  teacher_id: string;
  subject_id: string;
  class_id: string;
}

export interface Student {
  id: string;
  user_id: string;
  name: string;
  roll_number: string;
  class_id: string;
  email: string;
}

export type AttendanceStatus = 'present' | 'absent';

export interface AttendanceRecord {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  student_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  created_at: string;
  modified_at: string;
  override_reason?: string;
}

export interface MergedClassReport {
  id: string;
  class_id: string;
  report_date: string;
  total_students: number;
  total_subjects: number;
  avg_attendance_pct: number;
  subject_breakdown: SubjectAttendanceSummary[];
  generated_at: string;
}

export interface SubjectAttendanceSummary {
  subject_id: string;
  subject_name: string;
  present: number;
  absent: number;
  total: number;
  percentage: number;
}

export type RiskLevel = 'safe' | 'moderate' | 'high';

export interface AnalyticsCache {
  student_id: string;
  overall_pct: number;
  subject_wise: { subject_id: string; subject_name: string; pct: number; attended: number; total: number }[];
  risk_level: RiskLevel;
  weekly_avg: number;
  trend: number; // slope: negative = declining
  updated_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  performed_by: string;
  target_record_id: string;
  reason: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  student_id: string;
  type: 'absence' | 'risk_change' | 'report';
  message: string;
  read: boolean;
  created_at: string;
}

export interface RecoverySimulation {
  totalConducted: number;
  totalAttended: number;
  remainingClasses: number;
  currentPct: number;
  classesNeededFor75: number;
  classesNeededFor85: number;
  canReach75: boolean;
  canReach85: boolean;
}
