import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { StatCard } from '@/components/StatCard';
import { RiskBadge } from '@/components/RiskBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface StudentAnalytics {
  overallPct: number;
  subjectWise: {
    subjectId: string;
    subjectName: string;
    pct: number;
    attended: number;
    total: number;
  }[];
  riskLevel: 'safe' | 'moderate' | 'high';
  weeklyAvg: number;
  trend: number;
}

interface StudentRecord {
  id: string;
  attendanceDate: string;
  status: 'present' | 'absent';
  subjectName: string;
  className: string;
}

interface TeacherSubject {
  id: string;
  code: string;
  name: string;
}

interface TeacherClass {
  id: string;
  name: string;
}

interface AttendanceRecordRow {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  status: 'present' | 'absent';
}

interface DepartmentSummaryRow {
  id: string;
  name: string;
  students: number;
  avgPct: number;
  safe: number;
  moderate: number;
  high: number;
}

interface RiskDistribution {
  safe: number;
  moderate: number;
  high: number;
  total: number;
}

const RISK_COLORS = { safe: '#22c55e', moderate: '#eab308', high: '#ef4444' };

function buildStudentTrend(records: StudentRecord[]) {
  const byDate = new Map<string, { present: number; total: number }>();
  for (const record of records) {
    const current = byDate.get(record.attendanceDate) ?? { present: 0, total: 0 };
    current.total += 1;
    if (record.status === 'present') current.present += 1;
    byDate.set(record.attendanceDate, current);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      pct: stats.total ? Math.round((stats.present / stats.total) * 100) : 0,
    }));
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === 'student') {
    return <StudentDashboard studentProfileId={user.profile_id} />;
  }
  if (user.role === 'teacher') {
    return <TeacherDashboard />;
  }
  if (user.role === 'hod') {
    return <HodDashboard />;
  }
  return <Navigate to="/dashboard" replace />;
}

function StudentDashboard({ studentProfileId }: { studentProfileId?: string }) {
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentProfileId) {
      setError('Student profile missing. Please sign in again.');
      return;
    }

    void (async () => {
      try {
        const [analyticsData, recordsData] = await Promise.all([
          apiRequest<StudentAnalytics>(`/api/analytics/student/${studentProfileId}`),
          apiRequest<StudentRecord[]>(`/api/attendance/student/${studentProfileId}`),
        ]);
        setAnalytics(analyticsData);
        setRecords(recordsData);
      } catch {
        setError('Failed to load dashboard data.');
      }
    })();
  }, [studentProfileId]);

  const trend = useMemo(() => buildStudentTrend(records), [records]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!analytics) return <p className="text-sm text-muted-foreground">Loading dashboard...</p>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Student Dashboard</h1>
        <p className="page-subtitle">Attendance insights from server data</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Overall Attendance" value={`${analytics.overallPct}%`} icon={ClipboardCheck} />
        <StatCard title="Risk Status" value={analytics.riskLevel.toUpperCase()} icon={AlertTriangle} />
        <StatCard title="Weekly Average" value={`${analytics.weeklyAvg}%`} icon={TrendingUp} />
        <StatCard title="Subjects" value={analytics.subjectWise.length} icon={BookOpen} />
      </div>

      <div className="mb-6">
        <RiskBadge level={analytics.riskLevel} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Daily Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="pct" stroke="hsl(175, 55%, 40%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Subject Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.subjectWise.map(subject => (
                <div key={subject.subjectId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{subject.subjectName}</span>
                    <span className="font-semibold">{subject.pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${subject.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TeacherDashboard() {
  const today = new Date().toISOString().split('T')[0];
  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [rows, setRows] = useState<AttendanceRecordRow[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiRequest<TeacherSubject[]>('/api/teacher/subjects');
        setSubjects(data);
      } catch {
        setSubjects([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!subjectId) {
      setClasses([]);
      return;
    }
    void (async () => {
      try {
        const data = await apiRequest<TeacherClass[]>(`/api/teacher/classes?subjectId=${encodeURIComponent(subjectId)}`);
        setClasses(data);
      } catch {
        setClasses([]);
      }
    })();
  }, [subjectId]);

  useEffect(() => {
    if (!subjectId || !classId || !date) {
      setRows([]);
      return;
    }
    void (async () => {
      try {
        const data = await apiRequest<AttendanceRecordRow[]>(
          `/api/attendance/records?classId=${encodeURIComponent(classId)}&subjectId=${encodeURIComponent(subjectId)}&date=${encodeURIComponent(date)}`,
        );
        setRows(data);
      } catch {
        setRows([]);
      }
    })();
  }, [subjectId, classId, date]);

  const present = rows.filter(row => row.status === 'present').length;
  const absent = rows.length - present;
  const pct = rows.length ? Math.round((present / rows.length) * 100) : 0;
  const selectedSubject = subjects.find(subject => subject.id === subjectId)?.name ?? '-';
  const selectedClass = classes.find(item => item.id === classId)?.name ?? '-';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Teacher Dashboard</h1>
        <p className="page-subtitle">Select subject, class and date to view dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="space-y-2">
          <Label>Subject</Label>
          <Select value={subjectId} onValueChange={(value) => { setSubjectId(value); setClassId(''); }}>
            <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
            <SelectContent>
              {subjects.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>{subject.code} - {subject.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Class</Label>
          <Select value={classId} onValueChange={setClassId} disabled={!subjectId}>
            <SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger>
            <SelectContent>
              {classes.map(item => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Class" value={selectedClass} icon={Users} />
        <StatCard title="Subject" value={selectedSubject} icon={BookOpen} />
        <StatCard title="Present / Absent" value={`${present}/${absent}`} icon={BarChart3} />
        <StatCard title="Attendance %" value={`${pct}%`} icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Marked Entries</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records for this selection.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b text-muted-foreground">
                  <tr>
                    <th className="py-2.5 pr-4">Roll</th>
                    <th className="py-2.5 pr-4">Student</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">{row.rollNumber}</td>
                      <td className="py-2.5 pr-4">{row.studentName}</td>
                      <td className={`py-2.5 font-medium ${row.status === 'present' ? 'text-success' : 'text-danger'}`}>
                        {row.status.toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HodDashboard() {
  const [summaryRows, setSummaryRows] = useState<DepartmentSummaryRow[]>([]);
  const [risk, setRisk] = useState<RiskDistribution>({ safe: 0, moderate: 0, high: 0, total: 0 });
  const [selectedClass, setSelectedClass] = useState('all');

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiRequest<DepartmentSummaryRow[]>('/api/analytics/department/summary');
        setSummaryRows(data);
      } catch {
        setSummaryRows([]);
      }
    })();
  }, []);

  useEffect(() => {
    const query = selectedClass === 'all' ? '' : `?classId=${encodeURIComponent(selectedClass)}`;
    void (async () => {
      try {
        const data = await apiRequest<RiskDistribution>(`/api/analytics/risk-distribution${query}`);
        setRisk(data);
      } catch {
        setRisk({ safe: 0, moderate: 0, high: 0, total: 0 });
      }
    })();
  }, [selectedClass]);

  const averagePct = summaryRows.length
    ? Math.round(summaryRows.reduce((sum, row) => sum + row.avgPct, 0) / summaryRows.length)
    : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">HOD Dashboard</h1>
        <p className="page-subtitle">Department analytics from live backend data</p>
      </div>

      <div className="mb-4 max-w-sm">
        <Label>Risk Distribution Scope</Label>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {summaryRows.map(row => (
              <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Classes" value={summaryRows.length} icon={Users} />
        <StatCard title="Average Attendance" value={`${averagePct}%`} icon={TrendingUp} />
        <StatCard title="Safe Students" value={risk.safe} icon={ClipboardCheck} />
        <StatCard title="High Risk Students" value={risk.high} icon={AlertTriangle} variant="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Class Average Attendance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summaryRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="avgPct" fill="hsl(220, 60%, 20%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Risk Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Safe', value: risk.safe },
                    { name: 'Moderate', value: risk.moderate },
                    { name: 'High', value: risk.high },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  dataKey="value"
                  label
                >
                  <Cell fill={RISK_COLORS.safe} />
                  <Cell fill={RISK_COLORS.moderate} />
                  <Cell fill={RISK_COLORS.high} />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Class Summary</CardTitle></CardHeader>
        <CardContent>
          {summaryRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No class summary available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b text-muted-foreground">
                  <tr>
                    <th className="py-2.5 pr-4">Class</th>
                    <th className="py-2.5 pr-4">Students</th>
                    <th className="py-2.5 pr-4">Avg %</th>
                    <th className="py-2.5 pr-4">Safe</th>
                    <th className="py-2.5 pr-4">Moderate</th>
                    <th className="py-2.5">High</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map(row => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{row.name}</td>
                      <td className="py-2.5 pr-4">{row.students}</td>
                      <td className="py-2.5 pr-4 font-semibold">{row.avgPct}%</td>
                      <td className="py-2.5 pr-4 text-success">{row.safe}</td>
                      <td className="py-2.5 pr-4 text-warning">{row.moderate}</td>
                      <td className="py-2.5 text-danger">{row.high}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
