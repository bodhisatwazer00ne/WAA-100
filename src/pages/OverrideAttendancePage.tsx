import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  classes,
  students,
  attendanceRecords,
  auditLogs,
  recomputeAnalyticsCache,
  persistAttendanceRecords,
} from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';

export default function OverrideAttendancePage() {
  const { user } = useAuth();
  const cls = classes.find(c => c.class_teacher_id === user?.id);
  const classStudents = cls ? students.filter(s => s.class_id === cls.id) : [];
  
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');

  const handleOverride = () => {
    if (!studentId || !date || !reason.trim()) {
      toast.error('All fields are required');
      return;
    }

    const records = attendanceRecords.filter(
      r => r.student_id === studentId && r.attendance_date === date && r.status === 'absent'
    );

    if (records.length === 0) {
      toast.error('No absence records found for this student on this date');
      return;
    }

    // Mock override in in-memory store
    records.forEach(r => {
      r.status = 'present';
      r.modified_at = new Date().toISOString();
      r.override_reason = reason;
    });

    auditLogs.push({
      id: `audit-${Date.now()}`,
      action: 'attendance_override',
      performed_by: user!.id,
      target_record_id: records[0].id,
      reason,
      timestamp: new Date().toISOString(),
    });

    // Persist updated attendance and analytics
    persistAttendanceRecords();
    recomputeAnalyticsCache();

    toast.success(`Overridden ${records.length} absence record(s) to present`);
    setStudentId('');
    setDate('');
    setReason('');
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Override Attendance</h1>
        <p className="page-subtitle">Change locked attendance records with mandatory reason</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Override Form
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>
                {classStudents.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.roll_number} — {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Reason (mandatory)</Label>
            <Textarea
              placeholder="e.g., Student had a medical certificate"
              value={reason}
              onChange={e => setReason(e.target.value)}
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
