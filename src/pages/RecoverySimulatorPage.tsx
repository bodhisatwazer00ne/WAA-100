import { useMemo, useState } from 'react';
import { students, subjects, attendanceRecords } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { computeRecovery } from '@/services/attendanceService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, CheckCircle, XCircle } from 'lucide-react';

export default function RecoverySimulatorPage() {
  const { user } = useAuth();
  const student = useMemo(
    () => students.find(s => s.user_id === user?.id),
    [user?.id],
  );
  const [remaining, setRemaining] = useState(30);

  if (!student) {
    return <p className="text-muted-foreground">Student data not found</p>;
  }

  const enrolledSubjectIds = useMemo(() => {
    const recs = attendanceRecords.filter(r => r.student_id === student.id);
    return Array.from(new Set(recs.map(r => r.subject_id)));
  }, [student.id]);

  const enrolledSubjects = subjects.filter(s => enrolledSubjectIds.includes(s.id));

  if (enrolledSubjects.length === 0) {
    return <p className="text-muted-foreground">No subject enrolments found for recovery simulation.</p>;
  }

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    enrolledSubjects[0]?.id ?? '',
  );

  const selectedSubject = enrolledSubjects.find(s => s.id === selectedSubjectId) ?? enrolledSubjects[0];

  const sim = computeRecovery(student.id, remaining, selectedSubjectId);

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
            <Select
              value={selectedSubjectId}
              onValueChange={value => setSelectedSubjectId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {enrolledSubjects.map(sub => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name}
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
              onChange={e => setRemaining(Number(e.target.value) || 0)}
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
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${sim.canReach75 ? 'bg-success' : 'bg-danger'}`}
                  style={{ width: `${sim.canReach75 && remaining > 0 ? Math.min(100, (sim.classesNeededFor75 / remaining) * 100) : 100}%` }}
                />
              </div>
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
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${sim.canReach85 ? 'bg-success' : 'bg-danger'}`}
                  style={{ width: `${sim.canReach85 && remaining > 0 ? Math.min(100, (sim.classesNeededFor85 / remaining) * 100) : 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
