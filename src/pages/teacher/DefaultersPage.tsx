import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { RiskBadge } from '@/components/app/RiskBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface TeacherSubject {
  id: string;
  code: string;
  name: string;
}

interface TeacherClass {
  id: string;
  name: string;
}

interface DefaulterRow {
  studentId: string;
  rollNumber: string;
  studentName: string;
  total: number;
  present: number;
  pct: number;
}

interface DefaultersResponse {
  class: { id: string; name: string } | null;
  subject: { id: string; code: string; name: string } | null;
  defaulters: DefaulterRow[];
}

export default function DefaultersPage() {
  const { user } = useAuth();
  if (!user) return null;

  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [data, setData] = useState<DefaultersResponse | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const subjectRows = await apiRequest<TeacherSubject[]>('/api/teacher/subjects');
        setSubjects(subjectRows);
        if (subjectRows.length > 0) setSelectedSubject(subjectRows[0].id);
      } catch {
        setSubjects([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedSubject) {
      setClasses([]);
      setSelectedClass('');
      return;
    }
    void (async () => {
      try {
        const classRows = await apiRequest<TeacherClass[]>(
          `/api/teacher/classes?subjectId=${encodeURIComponent(selectedSubject)}`,
        );
        setClasses(classRows);
        setSelectedClass(classRows[0]?.id ?? '');
      } catch {
        setClasses([]);
        setSelectedClass('');
      }
    })();
  }, [selectedSubject]);

  useEffect(() => {
    if (!selectedSubject || !selectedClass) {
      setData(null);
      return;
    }
    void (async () => {
      try {
        const response = await apiRequest<DefaultersResponse>(
          `/api/reports/teacher-defaulters?subjectId=${encodeURIComponent(selectedSubject)}&classId=${encodeURIComponent(selectedClass)}`,
        );
        setData(response);
      } catch {
        setData({ class: null, subject: null, defaulters: [] });
      }
    })();
  }, [selectedClass, selectedSubject]);

  const selectedSubjectName = useMemo(() => {
    return subjects.find(subject => subject.id === selectedSubject)?.name ?? '-';
  }, [selectedSubject, subjects]);

  const selectedClassName = useMemo(() => {
    return classes.find(classRow => classRow.id === selectedClass)?.name ?? '-';
  }, [classes, selectedClass]);

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
              {subjects.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>{subject.code} - {subject.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Select Class</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!selectedSubject}>
            <SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger>
            <SelectContent>
              {classes.map(classRow => (
                <SelectItem key={classRow.id} value={classRow.id}>{classRow.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Viewing: <strong>{selectedSubjectName}</strong> in <strong>{selectedClassName}</strong>
      </p>

      {!data || data.defaulters.length === 0 ? (
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
                  {data.defaulters.map(row => (
                    <tr key={row.studentId} className="border-b last:border-0">
                      <td className="p-3 font-mono text-xs">{row.rollNumber}</td>
                      <td className="p-3 font-medium">{row.studentName}</td>
                      <td className="p-3">{row.present}/{row.total}</td>
                      <td className="p-3 text-danger font-semibold">{row.pct}%</td>
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

