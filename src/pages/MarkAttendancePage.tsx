import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTeacherSubjects,
  getTeacherClassesForSubject,
  getStudentsByClass,
  hasAttendanceForDate,
} from '@/services/attendanceService';
import {
  subjects as allSubjects,
  classes as allClasses,
  attendanceRecords,
  recomputeAnalyticsCache,
  persistAttendanceRecords,
} from '@/data/mockData';
import type { AttendanceStatus } from '@/types/waa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ClipboardCheck, Download, Loader2 } from 'lucide-react';
import { downloadTablePdf } from '@/lib/pdf';
import { apiUrl } from '@/lib/api';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LastSubmission {
  subjectName: string;
  className: string;
  date: string;
  present: number;
  absent: number;
  rows: { roll: string; name: string; status: AttendanceStatus }[];
}

export default function MarkAttendancePage() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<LastSubmission | null>(null);

  if (!user) return null;

  const teacherSubjects = getTeacherSubjects(user.id);
  const teacherClasses = selectedSubject ? getTeacherClassesForSubject(user.id, selectedSubject) : [];
  const studentList = selectedClass ? getStudentsByClass(selectedClass) : [];
  const alreadyMarked = selectedClass && selectedSubject
    ? hasAttendanceForDate(selectedClass, selectedSubject, selectedDate)
    : false;

  const existingSubmission: LastSubmission | null = selectedClass && selectedSubject && selectedDate
    ? (() => {
      const records = attendanceRecords.filter(
        r => r.class_id === selectedClass && r.subject_id === selectedSubject && r.attendance_date === selectedDate,
      );
      if (records.length === 0) return null;
      const subjectName = allSubjects.find(s => s.id === selectedSubject)?.name || selectedSubject;
      const className = allClasses.find(c => c.id === selectedClass)?.name || selectedClass;
      const present = records.filter(r => r.status === 'present').length;
      const absent = records.length - present;
      const rows = records
        .map(r => {
          const stu = studentList.find(s => s.id === r.student_id);
          return {
            roll: stu?.roll_number || r.student_id,
            name: stu?.name || r.student_id,
            status: r.status as AttendanceStatus,
          };
        })
        .sort((a, b) => a.roll.localeCompare(b.roll));
      return { subjectName, className, date: selectedDate, present, absent, rows };
    })()
    : null;

  const allMarked = studentList.length > 0 && studentList.every(s => attendance[s.id]);
  const unmarkedCount = studentList.filter(s => !attendance[s.id]).length;

  const handleSubjectChange = (val: string) => {
    setSelectedSubject(val);
    setSelectedClass('');
    setAttendance({});
  };

  const handleClassChange = (val: string) => {
    setSelectedClass(val);
    setAttendance({});
  };

  const handleSubmit = () => {
    if (!allMarked) {
      toast.error(`${unmarkedCount} student(s) not marked yet`);
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = () => {
    setLoading(true);
    setTimeout(async () => {
      const newRecords = studentList.map(s => ({
        id: `att-new-${Date.now()}-${s.id}`,
        class_id: selectedClass,
        subject_id: selectedSubject,
        teacher_id: user.id,
        student_id: s.id,
        attendance_date: selectedDate,
        status: attendance[s.id],
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
      }));

      attendanceRecords.push(...(newRecords as any));
      persistAttendanceRecords();
      recomputeAnalyticsCache();

      const subjectName = allSubjects.find(s => s.id === selectedSubject)?.name || selectedSubject;
      const className = allClasses.find(c => c.id === selectedClass)?.name || selectedClass;
      const present = Object.values(attendance).filter(v => v === 'present').length;
      const absent = Object.values(attendance).filter(v => v === 'absent').length;

      setLastSubmission({
        subjectName,
        className,
        date: selectedDate,
        present,
        absent,
        rows: studentList.map(stu => ({
          roll: stu.roll_number,
          name: stu.name,
          status: attendance[stu.id],
        })),
      });

      const absentPayload = studentList
        .filter(stu => attendance[stu.id] === 'absent')
        .map(stu => {
          const subjectRecords = attendanceRecords.filter(
            r => r.student_id === stu.id && r.subject_id === selectedSubject,
          );
          const total = subjectRecords.length;
          const presentInSubject = subjectRecords.filter(r => r.status === 'present').length;
          const subjectPct = total > 0 ? (presentInSubject / total) * 100 : 100;
          const riskCategory = subjectPct >= 85 ? 'safe' : subjectPct >= 75 ? 'moderate' : 'high';
          return {
            studentName: stu.name,
            email: stu.email,
            subjectName,
            className,
            date: selectedDate,
            riskCategory,
            subjectPct,
          };
        });

      if (absentPayload.length > 0) {
        try {
          const resp = await fetch(apiUrl('/api/public/notify-absences'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ absences: absentPayload }),
          });
          if (!resp.ok) {
            const errorBody = await resp.text();
            console.error('Failed to send absence emails:', errorBody);
            toast.error('Attendance saved, but absence email sending failed.');
          } else {
            const result = await resp.json();
            if (result.failed > 0) {
              const firstFailure = result.failures?.[0];
              toast.error(
                `Attendance saved. Emails sent: ${result.sent}/${result.total}. First error: ${firstFailure?.reason || 'Unknown SMTP error'}`,
              );
            } else {
              toast.success(`Attendance saved. Emails sent: ${result.sent}/${result.total}`);
            }
          }
        } catch (error) {
          console.error('Error sending absence emails:', error);
          toast.error('Attendance saved, but could not connect to email service.');
        }
      }

      toast.success(`Attendance saved for ${studentList.length} students`);
      setAttendance({});
      setSelectedClass('');
      setSelectedSubject('');
      setLoading(false);
      setShowConfirm(false);
    }, 600);
  };

  const downloadSubmissionPdf = (submission: LastSubmission | null) => {
    if (!submission) return;

    const rows = submission.rows.map(r => [
      r.roll,
      r.name,
      r.status === 'present' ? 'P' : 'A',
    ]);

    downloadTablePdf({
      filename: `attendance-${submission.className.replace(/\s+/g, '-')}-${submission.date}.pdf`,
      title: 'Attendance Marking Report',
      subtitleLines: [
        `Class: ${submission.className}`,
        `Subject: ${submission.subjectName}`,
        `Date: ${submission.date}`,
        `Present: ${submission.present} | Absent: ${submission.absent}`,
        'Legend: P = Present, A = Absent',
      ],
      headers: ['Roll No', 'Student Name', 'Status'],
      rows,
    });
    toast.success('PDF downloaded');
  };

  const subjectName = allSubjects.find(s => s.id === selectedSubject)?.name;
  const className = allClasses.find(c => c.id === selectedClass)?.name;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mark Attendance</h1>
        <p className="page-subtitle">Select subject, class, and date to mark attendance</p>
      </div>

      {lastSubmission && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-success/30 bg-success/10 p-3">
          <div className="text-sm">
            <p className="font-medium text-success">Attendance submitted successfully</p>
            <p className="text-muted-foreground">
              <strong>{lastSubmission.className}</strong> | {lastSubmission.subjectName} | {lastSubmission.date}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadSubmissionPdf(lastSubmission)}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="space-y-2">
          <Label>Select Date</Label>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Select Subject</Label>
          <Select value={selectedSubject} onValueChange={handleSubjectChange}>
            <SelectTrigger><SelectValue placeholder="Choose a subject" /></SelectTrigger>
            <SelectContent>
              {teacherSubjects.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Select Class</Label>
          <Select value={selectedClass} onValueChange={handleClassChange} disabled={!selectedSubject}>
            <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
            <SelectContent>
              {teacherClasses.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedClass && selectedSubject && (
        <>
          <div className="sticky top-0 z-10 bg-card border rounded-lg p-3 mb-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">{subjectName}</span>
              <span className="text-muted-foreground">|</span>
              <span>{className}</span>
              <span className="text-muted-foreground">|</span>
              <span>{selectedDate}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {studentList.length - unmarkedCount}/{studentList.length} marked
            </span>
          </div>

          {alreadyMarked && (
            <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm flex items-center justify-between gap-3">
              <span>Attendance already recorded for this class, subject, and date.</span>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => downloadSubmissionPdf(existingSubmission)}
                disabled={!existingSubmission}
              >
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" /> Student List ({studentList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0 divide-y">
                {studentList.map((stu, i) => (
                  <div key={stu.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
                      <div>
                        <p className="font-medium text-sm">{stu.name}</p>
                        <p className="text-xs text-muted-foreground">{stu.roll_number}</p>
                      </div>
                    </div>
                    <RadioGroup
                      value={attendance[stu.id] || ''}
                      onValueChange={(val) => setAttendance(prev => ({ ...prev, [stu.id]: val as AttendanceStatus }))}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="present" id={`${stu.id}-p`} />
                        <Label htmlFor={`${stu.id}-p`} className="text-sm text-success cursor-pointer">Present</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="absent" id={`${stu.id}-a`} />
                        <Label htmlFor={`${stu.id}-a`} className="text-sm text-danger cursor-pointer">Absent</Label>
                      </div>
                    </RadioGroup>
                  </div>
                ))}
              </div>

              {unmarkedCount > 0 && studentList.length > 0 && (
                <p className="text-xs text-danger mt-3">{unmarkedCount} student(s) still unmarked</p>
              )}

              <div className="mt-6 flex justify-end">
                <Button onClick={handleSubmit} disabled={loading || alreadyMarked} className="gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit Attendance
                </Button>
              </div>
            </CardContent>
          </Card>

          <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Attendance Submission</AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to submit attendance for {studentList.length} students in {subjectName} ({className}) for {selectedDate}.
                  <br /><br />
                  Present: {Object.values(attendance).filter(v => v === 'present').length} |
                  Absent: {Object.values(attendance).filter(v => v === 'absent').length}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmSubmit}>Confirm and Save</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
