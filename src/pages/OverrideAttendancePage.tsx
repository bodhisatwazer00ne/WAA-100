import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';

interface StudentRow {
  id: string;
  rollNumber: string;
  name: string;
}

interface MyClassInfo {
  id: string;
  name: string;
}

export default function OverrideAttendancePage() {
  const [myClass, setMyClass] = useState<MyClassInfo | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const cls = await apiRequest<MyClassInfo>('/api/reports/my-class');
        setMyClass(cls);
        const classStudents = await apiRequest<StudentRow[]>(`/api/classes/${cls.id}/students`);
        setStudents(classStudents);
      } catch {
        setMyClass(null);
        setStudents([]);
      }
    })();
  }, []);

  const handleOverride = async () => {
    if (!studentId || !date || !reason.trim()) {
      toast.error('All fields are required');
      return;
    }

    try {
      const response = await apiRequest<{ overriddenCount: number }>(
        '/api/attendance/override',
        {
          method: 'POST',
          body: JSON.stringify({
            studentId,
            date,
            reason: reason.trim(),
          }),
        },
      );
      toast.success(`Overridden ${response.overriddenCount} absence record(s) to present`);
      setStudentId('');
      setDate('');
      setReason('');
    } catch (error: any) {
      const message = String(error?.message ?? '');
      if (message.includes('No absence records found')) {
        toast.error('No absence records found for this student on this date');
      } else if (message.includes('Forbidden')) {
        toast.error('You are not authorized to override this student attendance');
      } else {
        toast.error('Failed to override attendance');
      }
    }
  };

  if (!myClass) return <p className="text-muted-foreground">No class assigned</p>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Override Attendance</h1>
        <p className="page-subtitle">Change locked attendance records with mandatory reason</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Override Form ({myClass.name})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>
                {students.map(student => (
                  <SelectItem key={student.id} value={student.id}>{student.rollNumber} - {student.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={event => setDate(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Reason (mandatory)</Label>
            <Textarea
              placeholder="e.g., Student had a medical certificate"
              value={reason}
              onChange={event => setReason(event.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={handleOverride} className="w-full">Override to Present</Button>

          <p className="text-xs text-muted-foreground">
            All overrides are recorded in the audit log.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
