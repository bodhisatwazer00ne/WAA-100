import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import { apiRequest } from '@/lib/api';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TeacherSubject {
  id: string;
  code: string;
  name: string;
}

interface TeacherClass {
  id: string;
  name: string;
}

interface ClassStudent {
  id: string;
  rollNumber: string;
  name: string;
  email: string;
}

interface AttendanceRecordRow {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  status: AttendanceStatus;
}

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

  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [studentList, setStudentList] = useState<ClassStudent[]>([]);
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<LastSubmission | null>(null);

  const selectedSubjectName = useMemo(
    () => teacherSubjects.find(s => s.id === selectedSubject)?.name || selectedSubject,
    [selectedSubject, teacherSubjects],
  );
  const selectedClassName = useMemo(
    () => teacherClasses.find(c => c.id === selectedClass)?.name || selectedClass,
    [selectedClass, teacherClasses],
  );

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const data = await apiRequest<TeacherSubject[]>('/api/teacher/subjects');
        setTeacherSubjects(data);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load teacher subjects');
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!selectedSubject) {
      setTeacherClasses([]);
      return;
    }
    void (async () => {
      try {
        const data = await apiRequest<TeacherClass[]>(
          `/api/teacher/classes?subjectId=${encodeURIComponent(selectedSubject)}`,
        );
        setTeacherClasses(data);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load classes for subject');
      }
    })();
  }, [selectedSubject]);

  useEffect(() => {
    if (!selectedClass) {
      setStudentList([]);
      return;
    }
    void (async () => {
      try {
        const data = await apiRequest<ClassStudent[]>(`/api/classes/${selectedClass}/students`);
        setStudentList(data);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load students');
      }
    })();
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass || !selectedSubject || !selectedDate) {
      setAlreadyMarked(false);
      setExistingSubmission(null);
      return;
    }

    void (async () => {
      try {
        const check = await apiRequest<{ exists: boolean }>(
          `/api/attendance/check?classId=${encodeURIComponent(selectedClass)}&subjectId=${encodeURIComponent(selectedSubject)}&date=${encodeURIComponent(selectedDate)}`,
        );
        setAlreadyMarked(check.exists);

        if (!check.exists) {
          setExistingSubmission(null);
          return;
        }

        const rows = await apiRequest<AttendanceRecordRow[]>(
          `/api/attendance/records?classId=${encodeURIComponent(selectedClass)}&subjectId=${encodeURIComponent(selectedSubject)}&date=${encodeURIComponent(selectedDate)}`,
        );

        const present = rows.filter(r => r.status === 'present').length;
        const absent = rows.length - present;
        setExistingSubmission({
          subjectName: selectedSubjectName,
          className: selectedClassName,
          date: selectedDate,
          present,
          absent,
          rows: rows
            .map(r => ({
              roll: r.rollNumber,
              name: r.studentName,
              status: r.status,
            }))
            .sort((a, b) => a.roll.localeCompare(b.roll)),
        });
      } catch (error) {
        console.error(error);
        setAlreadyMarked(false);
        setExistingSubmission(null);
      }
    })();
  }, [selectedClass, selectedSubject, selectedDate, selectedClassName, selectedSubjectName]);

  if (!user) return null;

  const allMarked = studentList.length > 0 && studentList.every(s => attendance[s.id]);
  const unmarkedCount = studentList.filter(s => !attendance[s.id]).length;

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    setSelectedClass('');
    setAttendance({});
    setExistingSubmission(null);
  };

  const handleClassChange = (value: string) => {
    setSelectedClass(value);
    setAttendance({});
    setExistingSubmission(null);
  };

  const handleSubmit = () => {
    if (!allMarked) {
      toast.error(`${unmarkedCount} student(s) not marked yet`);
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    try {
      setLoading(true);
      await apiRequest<{ count: number }>(
        '/api/attendance/mark',
        {
          method: 'POST',
          body: JSON.stringify({
            classId: selectedClass,
            subjectId: selectedSubject,
            date: selectedDate,
            attendance: Object.entries(attendance).map(([studentId, status]) => ({
              studentId,
              status,
            })),
          }),
        },
      );

      const present = Object.values(attendance).filter(v => v === 'present').length;
      const absent = Object.values(attendance).filter(v => v === 'absent').length;

      const submission: LastSubmission = {
        subjectName: selectedSubjectName,
        className: selectedClassName,
        date: selectedDate,
        present,
        absent,
        rows: studentList.map(stu => ({
          roll: stu.rollNumber,
          name: stu.name,
          status: attendance[stu.id],
        })),
      };

      setLastSubmission(submission);
      setAttendance({});
      setShowConfirm(false);
      setAlreadyMarked(true);
      setExistingSubmission(submission);
      toast.success(`Attendance saved for ${studentList.length} students`);
    } catch (error: any) {
      const message = String(error?.message ?? '');
      if (message.includes('already recorded')) {
        toast.error('Attendance already recorded for this class, subject, and date');
        setAlreadyMarked(true);
      } else {
        toast.error('Failed to save attendance');
      }
    } finally {
      setLoading(false);
    }
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
              <span className="font-medium">{selectedSubjectName}</span>
              <span className="text-muted-foreground">|</span>
              <span>{selectedClassName}</span>
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
                        <p className="text-xs text-muted-foreground">{stu.rollNumber}</p>
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
                  You are about to submit attendance for {studentList.length} students in {selectedSubjectName} ({selectedClassName}) for {selectedDate}.
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

