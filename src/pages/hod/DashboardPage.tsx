import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { StatCard } from '@/components/app/StatCard';
import { RiskBadge } from '@/components/app/RiskBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { downloadTablePdf } from '@/lib/pdf';
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

interface SubjectPerformanceRow {
  id: string;
  code: string;
  name: string;
  pct: number;
}

interface FacultyStatsResponseRow {
  teacherId: string;
  teacherName: string;
  classStats: {
    classId: string;
    className: string;
    present: number;
    total: number;
    sessions: number;
    pct: number;
  }[];
  subjectStats: {
    subjectId: string;
    subjectName: string;
    present: number;
    total: number;
    sessions: number;
    pct: number;
  }[];
}

interface HodDefaulterRow {
  studentId: string;
  rollNumber: string;
  studentName: string;
  present: number;
  total: number;
  pct: number;
  riskLevel: 'safe' | 'moderate' | 'high';
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
        <StatCard title="Overall Attendance" value={`${Math.round(analytics.overallPct)}%`} icon={ClipboardCheck} />
        <StatCard title="Risk Status" value={analytics.riskLevel.toUpperCase()} icon={AlertTriangle} />
        <StatCard title="Weekly Average" value={`${Math.round(analytics.weeklyAvg)}%`} icon={TrendingUp} />
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
                    <span className="font-semibold">{Math.round(subject.pct)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round(subject.pct)}%` }} />
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
  const today = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState<'faculty' | 'class' | 'subject' | 'defaulters'>('faculty');
  const [summaryRows, setSummaryRows] = useState<DepartmentSummaryRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<SubjectPerformanceRow[]>([]);
  const [facultyRows, setFacultyRows] = useState<FacultyStatsResponseRow[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classStudentRows, setClassStudentRows] = useState<
    { id: string; name: string; rollNumber: string; riskLevel: 'safe' | 'moderate' | 'high'; overallPct: number }[]
  >([]);
  const [defaulterRows, setDefaulterRows] = useState<HodDefaulterRow[]>([]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    void (async () => {
      try {
        const [summary, subjects] = await Promise.all([
          apiRequest<DepartmentSummaryRow[]>('/api/analytics/department/summary'),
          apiRequest<SubjectPerformanceRow[]>('/api/analytics/department/subject-performance'),
        ]);
        setSummaryRows(summary);
        setSubjectRows(subjects);
        if (summary.length > 0) setSelectedClassId(summary[0].id);
      } catch {
        setSummaryRows([]);
        setSubjectRows([]);
      }
    })();
  }, []);

  useEffect(() => {
    const query = new URLSearchParams();
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);

    void (async () => {
      try {
        const rows = await apiRequest<FacultyStatsResponseRow[]>(`/api/analytics/hod/faculty-stats?${query.toString()}`);
        setFacultyRows(rows);
        if (rows.length > 0 && !selectedFacultyId) setSelectedFacultyId(rows[0].teacherId);
      } catch {
        setFacultyRows([]);
      }
    })();
  }, [endDate, startDate, selectedFacultyId]);

  useEffect(() => {
    if (!selectedClassId) {
      setClassStudentRows([]);
      setDefaulterRows([]);
      return;
    }
    void (async () => {
      try {
        const classAnalytics = await apiRequest<
          { student: { id: string; name: string; rollNumber: string }; analytics: { overallPct: number; riskLevel: 'safe' | 'moderate' | 'high' } | null }[]
        >(`/api/analytics/class/${selectedClassId}`);
        setClassStudentRows(
          classAnalytics.map(row => ({
            id: row.student.id,
            name: row.student.name,
            rollNumber: row.student.rollNumber,
            riskLevel: row.analytics?.riskLevel ?? 'safe',
            overallPct: row.analytics?.overallPct ?? 0,
          })),
        );
      } catch {
        setClassStudentRows([]);
      }
    })();
  }, [selectedClassId]);

  useEffect(() => {
    if (!selectedClassId) {
      setDefaulterRows([]);
      return;
    }
    const query = new URLSearchParams({ classId: selectedClassId });
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);
    void (async () => {
      try {
        const response = await apiRequest<{ defaulters: HodDefaulterRow[] }>(`/api/analytics/hod/defaulters?${query.toString()}`);
        setDefaulterRows(response.defaulters);
      } catch {
        setDefaulterRows([]);
      }
    })();
  }, [selectedClassId, startDate, endDate]);

  const selectedFaculty = facultyRows.find(row => row.teacherId === selectedFacultyId) ?? null;
  const selectedClassSummary = summaryRows.find(row => row.id === selectedClassId) ?? null;
  const safeStudents = classStudentRows.filter(row => row.riskLevel === 'safe');
  const riskStudents = classStudentRows.filter(row => row.riskLevel !== 'safe');
  const classRiskData = selectedClassSummary
    ? [
        { name: 'Safe', value: selectedClassSummary.safe, color: RISK_COLORS.safe },
        { name: 'Moderate', value: selectedClassSummary.moderate, color: RISK_COLORS.moderate },
        { name: 'High', value: selectedClassSummary.high, color: RISK_COLORS.high },
      ]
    : [];

  const downloadDefaultersPdf = () => {
    const className = summaryRows.find(row => row.id === selectedClassId)?.name ?? selectedClassId;
    downloadTablePdf({
      filename: `hod-defaulters-${className.replace(/\s+/g, '-')}-${startDate}-${endDate}.pdf`,
      title: 'HOD Defaulter List',
      subtitleLines: [
        `Class: ${className}`,
        `Date Range: ${startDate} to ${endDate}`,
      ],
      headers: ['Roll No', 'Student Name', 'Present / Total', '%', 'Risk'],
      rows: defaulterRows.map(row => [
        row.rollNumber,
        row.studentName,
        `${row.present}/${row.total}`,
        `${row.pct}%`,
        row.riskLevel.toUpperCase(),
      ]),
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">HOD Dashboard</h1>
        <p className="page-subtitle">Faculty, class, subject, and defaulter analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label>From Date</Label>
          <Input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>To Date</Label>
          <Input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'faculty' | 'class' | 'subject' | 'defaulters')}>
        <TabsList className="mb-6 grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="faculty">Faculty Wise Stats</TabsTrigger>
          <TabsTrigger value="class">Class Wise Stats</TabsTrigger>
          <TabsTrigger value="subject">Subject Wise Stats</TabsTrigger>
          <TabsTrigger value="defaulters">Defaulter List</TabsTrigger>
        </TabsList>

        <TabsContent value="faculty">
          <div className="mb-4 max-w-sm">
            <Label>Select Faculty</Label>
            <Select value={selectedFacultyId} onValueChange={setSelectedFacultyId}>
              <SelectTrigger><SelectValue placeholder="Choose faculty" /></SelectTrigger>
              <SelectContent>
                {facultyRows.map(row => (
                  <SelectItem key={row.teacherId} value={row.teacherId}>{row.teacherName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedFaculty && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Class-wise % Graph</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={selectedFaculty.classStats.map(row => ({ name: row.className, pct: row.pct }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="pct" name="Attendance %" fill="hsl(220, 60%, 20%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Subject-wise % Graph</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={selectedFaculty.subjectStats.map(row => ({ name: row.subjectName, pct: row.pct }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="pct" name="Attendance %" fill="hsl(175, 55%, 40%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Class-wise Stats</CardTitle></CardHeader>
              <CardContent>
                {!selectedFaculty || selectedFaculty.classStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No class stats for selected faculty.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left border-b text-muted-foreground">
                        <tr>
                          <th className="py-2.5 pr-4">Class</th>
                          <th className="py-2.5 pr-4">Sessions</th>
                          <th className="py-2.5 pr-4">Present / Total</th>
                          <th className="py-2.5">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFaculty.classStats.map(row => (
                          <tr key={row.classId} className="border-b last:border-0">
                            <td className="py-2.5 pr-4">{row.className}</td>
                            <td className="py-2.5 pr-4">{row.sessions}</td>
                            <td className="py-2.5 pr-4">{row.present}/{row.total}</td>
                            <td className="py-2.5 font-semibold">{row.pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Subject-wise Stats</CardTitle></CardHeader>
              <CardContent>
                {!selectedFaculty || selectedFaculty.subjectStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No subject stats for selected faculty.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left border-b text-muted-foreground">
                        <tr>
                          <th className="py-2.5 pr-4">Subject</th>
                          <th className="py-2.5 pr-4">Sessions</th>
                          <th className="py-2.5 pr-4">Present / Total</th>
                          <th className="py-2.5">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFaculty.subjectStats.map(row => (
                          <tr key={row.subjectId} className="border-b last:border-0">
                            <td className="py-2.5 pr-4">{row.subjectName}</td>
                            <td className="py-2.5 pr-4">{row.sessions}</td>
                            <td className="py-2.5 pr-4">{row.present}/{row.total}</td>
                            <td className="py-2.5 font-semibold">{row.pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="class">
          <div className="mb-4 max-w-sm">
            <Label>Select Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger>
              <SelectContent>
                {summaryRows.map(row => (
                  <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Class Risk Distribution</CardTitle></CardHeader>
            <CardContent>
              {!selectedClassSummary ? (
                <p className="text-sm text-muted-foreground">Select a class to view risk chart.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={classRiskData} cx="50%" cy="50%" outerRadius={85} dataKey="value" label>
                      {classRiskData.map(item => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Safe Students</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm max-h-56 overflow-y-auto">
                  {safeStudents.length === 0 ? (
                    <p className="text-muted-foreground">No safe students.</p>
                  ) : safeStudents.map(row => (
                    <p key={row.id}>{row.rollNumber} - {row.name}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Risk Students</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm max-h-56 overflow-y-auto">
                  {riskStudents.length === 0 ? (
                    <p className="text-muted-foreground">No risk students.</p>
                  ) : riskStudents.map(row => (
                    <p key={row.id}>{row.rollNumber} - {row.name}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subject">
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Subject-wise % Graph</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={subjectRows.map(row => ({ name: row.code, pct: row.pct }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="pct" name="Attendance %" fill="hsl(220, 60%, 20%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Subject Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left border-b text-muted-foreground">
                    <tr>
                      <th className="py-2.5 pr-4">Subject</th>
                      <th className="py-2.5">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectRows.map(row => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-4">{row.name}</td>
                        <td className="py-2.5 font-semibold">{row.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaulters">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Select Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger>
                <SelectContent>
                  {summaryRows.map(row => (
                    <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-end justify-end">
              <Button variant="outline" onClick={downloadDefaultersPdf}>Download Defaulter List PDF</Button>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Defaulter Attendance %</CardTitle></CardHeader>
            <CardContent>
              {defaulterRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No defaulter graph data for the selected filters.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={defaulterRows.map(row => ({ name: row.rollNumber, pct: row.pct }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="pct" name="Attendance %" fill="hsl(355, 78%, 58%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Defaulter Students (Attendance &lt; 75%)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left border-b text-muted-foreground">
                    <tr>
                      <th className="py-2.5 pr-4">Roll No</th>
                      <th className="py-2.5 pr-4">Name</th>
                      <th className="py-2.5 pr-4">Present / Total</th>
                      <th className="py-2.5 pr-4">%</th>
                      <th className="py-2.5">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaulterRows.map(row => (
                      <tr key={row.studentId} className="border-b last:border-0">
                        <td className="py-2.5 pr-4">{row.rollNumber}</td>
                        <td className="py-2.5 pr-4">{row.studentName}</td>
                        <td className="py-2.5 pr-4">{row.present}/{row.total}</td>
                        <td className="py-2.5 pr-4 font-semibold">{row.pct}%</td>
                        <td className="py-2.5"><RiskBadge level={row.riskLevel} /></td>
                      </tr>
                    ))}
                    {defaulterRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-muted-foreground text-sm">
                          No defaulters for the selected class and date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


