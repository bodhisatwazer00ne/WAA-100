import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { students, classes, subjects, attendanceRecords, teacherMappings } from '@/data/mockData';
import { RiskBadge } from '@/components/RiskBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function DefaultersPage() {
  const { user } = useAuth();
  if (!user) return null;

  const teacherSubjectIds = [...new Set(teacherMappings.filter(m => m.teacher_id === user.id).map(m => m.subject_id))];
  const teacherSubjects = subjects.filter(s => teacherSubjectIds.includes(s.id));

  const [selectedSubject, setSelectedSubject] = useState<string>(teacherSubjects[0]?.id || '');

  const classOptions = useMemo(() => {
    if (!selectedSubject) return [];
    const classIds = teacherMappings
      .filter(m => m.teacher_id === user.id && m.subject_id === selectedSubject)
      .map(m => m.class_id);
    return classes.filter(c => classIds.includes(c.id));
  }, [user.id, selectedSubject]);

  const [selectedClass, setSelectedClass] = useState<string>('');

  const effectiveClass = selectedClass || classOptions[0]?.id || '';

  const defaulters = useMemo(() => {
    if (!selectedSubject || !effectiveClass) return [];
    const classStudents = students.filter(s => s.class_id === effectiveClass);

    return classStudents
      .map(student => {
        const records = attendanceRecords.filter(
          r => r.student_id === student.id && r.class_id === effectiveClass && r.subject_id === selectedSubject,
        );
        const total = records.length;
        const present = records.filter(r => r.status === 'present').length;
        const pct = total > 0 ? Math.round((present / total) * 100) : 0;
        return {
          student,
          total,
          present,
          pct,
        };
      })
      .filter(d => d.total > 0 && d.pct < 75)
      .sort((a, b) => a.pct - b.pct);
  }, [selectedSubject, effectiveClass]);

  const selectedClassName = classes.find(c => c.id === effectiveClass)?.name || '-';
  const selectedSubjectName = subjects.find(s => s.id === selectedSubject)?.name || '-';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Defaulter List</h1>
        <p className="page-subtitle">Select subject and class to view defaulters below 75%</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label>Select Subject</Label>
          <Select
            value={selectedSubject}
            onValueChange={(value) => {
              setSelectedSubject(value);
              setSelectedClass('');
            }}
          >
            <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
            <SelectContent>
              {teacherSubjects.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Select Class</Label>
          <Select value={effectiveClass} onValueChange={setSelectedClass} disabled={!selectedSubject}>
            <SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger>
            <SelectContent>
              {classOptions.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Viewing: <strong>{selectedSubjectName}</strong> in <strong>{selectedClassName}</strong>
      </p>

      {defaulters.length === 0 ? (
        <p className="text-muted-foreground">No defaulters found for the selected subject and class.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="p-3 text-left font-medium text-muted-foreground">Roll No</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Present / Total</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Attendance %</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {defaulters.map(d => (
                    <tr key={d.student.id} className="border-b last:border-0">
                      <td className="p-3 font-mono text-xs">{d.student.roll_number}</td>
                      <td className="p-3 font-medium">{d.student.name}</td>
                      <td className="p-3">{d.present}/{d.total}</td>
                      <td className="p-3 text-danger font-semibold">{d.pct}%</td>
                      <td className="p-3"><RiskBadge level="high" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
