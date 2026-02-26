import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle } from 'lucide-react';

interface AttendanceRecordRow {
  id: string;
  attendanceDate: string;
  status: 'present' | 'absent';
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
}

interface RecoveryResult {
  totalConducted: number;
  totalAttended: number;
  remainingClasses: number;
  currentPct: number;
  classesNeededFor75: number;
  classesNeededFor85: number;
  canReach75: boolean;
  canReach85: boolean;
}

export default function RecoverySimulatorPage() {
  const { user } = useAuth();
  const studentId = user?.profile_id;
  const [remaining, setRemaining] = useState(30);
  const [records, setRecords] = useState<AttendanceRecordRow[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [sim, setSim] = useState<RecoveryResult | null>(null);

  useEffect(() => {
    if (!studentId) return;
    void (async () => {
      try {
        const rows = await apiRequest<AttendanceRecordRow[]>(`/api/attendance/student/${studentId}`);
        setRecords(rows);
        const firstSubjectId = rows[0]?.subjectId ?? '';
        setSelectedSubjectId(firstSubjectId);
      } catch {
        setRecords([]);
      }
    })();
  }, [studentId]);

  const enrolledSubjects = useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of records) byId.set(row.subjectId, row.subjectName);
    return Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
  }, [records]);

  useEffect(() => {
    if (!studentId || !selectedSubjectId) {
      setSim(null);
      return;
    }
    void (async () => {
      try {
        const response = await apiRequest<RecoveryResult>(
          `/api/recovery/student/${studentId}?remainingClasses=${encodeURIComponent(String(remaining))}&subjectId=${encodeURIComponent(selectedSubjectId)}`,
        );
        setSim(response);
      } catch {
        setSim(null);
      }
    })();
  }, [remaining, selectedSubjectId, studentId]);

  if (!studentId) return <p className="text-muted-foreground">Student data not found</p>;
  if (enrolledSubjects.length === 0) return <p className="text-muted-foreground">No subject enrollments found for recovery simulation.</p>;
  if (!sim) return <p className="text-muted-foreground">Loading recovery simulation...</p>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Recovery Simulator</h1>
        <p className="page-subtitle">
          Select a subject and see how many more classes you need to attend in that subject to reach attendance targets.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {enrolledSubjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Remaining classes in semester</Label>
            <Input
              type="number"
              min={0}
              max={200}
              value={remaining}
              onChange={event => setRemaining(Number(event.target.value) || 0)}
            />
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Current Status</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{sim.totalConducted}</div>
                <div className="text-xs text-muted-foreground">Total Conducted</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success">{sim.totalAttended}</div>
                <div className="text-xs text-muted-foreground">Total Attended</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${sim.currentPct >= 85 ? 'text-success' : sim.currentPct >= 75 ? 'text-warning' : 'text-danger'}`}>
                  {sim.currentPct}%
                </div>
                <div className="text-xs text-muted-foreground">Current %</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className={sim.canReach75 ? 'border-success/30' : 'border-danger/30'}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium">Target: 75%</p>
                  <p className="text-xs text-muted-foreground">Minimum required</p>
                </div>
                {sim.canReach75 ? <CheckCircle className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-danger" />}
              </div>
              <div className="text-3xl font-bold mb-2">
                {sim.canReach75 ? sim.classesNeededFor75 : 'Attendance is too low'}
              </div>
              <p className="text-sm text-muted-foreground">
                {sim.canReach75
                  ? `classes needed out of ${remaining} remaining`
                  : `Cannot reach 75% with ${remaining} classes remaining`}
              </p>
            </CardContent>
          </Card>

          <Card className={sim.canReach85 ? 'border-success/30' : 'border-danger/30'}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium">Target: 85%</p>
                  <p className="text-xs text-muted-foreground">Safe zone</p>
                </div>
                {sim.canReach85 ? <CheckCircle className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-danger" />}
              </div>
              <div className="text-3xl font-bold mb-2">
                {sim.canReach85 ? sim.classesNeededFor85 : 'Attendance is too low'}
              </div>
              <p className="text-sm text-muted-foreground">
                {sim.canReach85
                  ? `classes needed out of ${remaining} remaining`
                  : `Cannot reach 85% with ${remaining} classes remaining`}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
