import { useMemo, useState } from 'react';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { StatCard } from '@/components/StatCard';
import { RiskBadge } from '@/components/RiskBadge';
import { getClassAnalytics, getRiskDistribution, getStudentAnalytics, getAttendanceTrend } from '@/services/attendanceService';
import { students, classes, subjects, analyticsCache, attendanceRecords, teacherMappings, users } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { downloadTablePdf } from '@/lib/pdf';
import { Users, BookOpen, ClipboardCheck, AlertTriangle, TrendingUp, BarChart3, GraduationCap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

const RISK_COLORS = { safe: '#22c55e', moderate: '#eab308', high: '#ef4444' };

function getDateRangeLabel(records: { attendance_date: string }[]) {
  if (records.length === 0) return 'No attendance records';
  const dates = records.map(r => r.attendance_date).sort();
  return `${dates[0]} to ${dates[dates.length - 1]}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === 'student') return <StudentDashboard userId={user.id} />;
  if (user.role === 'teacher') {
    const isClassTeacher = classes.some(c => c.class_teacher_id === user.id);
    return <Navigate to={isClassTeacher ? '/reports/merged' : '/attendance/mark'} replace />;
  }
  if (user.role === 'hod') return <HODDashboard />;
  return null;
}

function StudentDashboard({ userId }: { userId: string }) {
  const student = students.find(s => s.user_id === userId);
  if (!student) return <p>Student not found</p>;
  const analytics = getStudentAnalytics(student.id);
  const trend = getAttendanceTrend(student.id);
  const [selectedCard, setSelectedCard] = useState<'overall' | 'risk' | 'weekly' | 'subjects'>('overall');
  if (!analytics) return <p>No data</p>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Dashboard</h1>
        <p className="page-subtitle">Welcome back, {student.name} ({student.roll_number})</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Overall Attendance" value={`${analytics.overall_pct}%`} icon={ClipboardCheck}
          variant={analytics.risk_level === 'safe' ? 'success' : analytics.risk_level === 'moderate' ? 'warning' : 'danger'}
          onClick={() => setSelectedCard('overall')}
          active={selectedCard === 'overall'} />
        <StatCard title="Risk Status" value={analytics.risk_level.toUpperCase()} icon={AlertTriangle}
          variant={analytics.risk_level === 'safe' ? 'success' : analytics.risk_level === 'moderate' ? 'warning' : 'danger'}
          onClick={() => setSelectedCard('risk')}
          active={selectedCard === 'risk'} />
        <StatCard title="Weekly Average" value={`${analytics.weekly_avg}%`} icon={TrendingUp} trend={analytics.trend}
          onClick={() => setSelectedCard('weekly')}
          active={selectedCard === 'weekly'} />
        <StatCard title="Subjects" value={analytics.subject_wise.length} icon={BookOpen} subtitle="Currently enrolled"
          onClick={() => setSelectedCard('subjects')}
          active={selectedCard === 'subjects'} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">
            {selectedCard === 'overall' && 'Overall Attendance Details'}
            {selectedCard === 'risk' && 'Risk Status Details'}
            {selectedCard === 'weekly' && 'Weekly Performance Details'}
            {selectedCard === 'subjects' && 'Enrolled Subjects Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedCard === 'overall' && (
            <p className="text-sm">Current overall attendance is <strong>{analytics.overall_pct}%</strong>.</p>
          )}
          {selectedCard === 'risk' && (
            <p className="text-sm">Current risk level is <strong>{analytics.risk_level.toUpperCase()}</strong>.</p>
          )}
          {selectedCard === 'weekly' && (
            <p className="text-sm">Weekly average is <strong>{analytics.weekly_avg}%</strong> with trend <strong>{analytics.trend}%</strong>.</p>
          )}
          {selectedCard === 'subjects' && (
            <div className="text-sm space-y-1">
              {analytics.subject_wise.map(sw => (
                <p key={sw.subject_id}>{sw.subject_name}: <strong>{sw.pct}%</strong></p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Attendance Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
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
          <CardHeader><CardTitle className="text-base">Subject-wise Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.subject_wise.map(sw => (
                <div key={sw.subject_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{sw.subject_name}</span>
                    <span className={sw.pct >= 85 ? 'text-success' : sw.pct >= 75 ? 'text-warning' : 'text-danger'}>
                      {sw.pct}% ({sw.attended}/{sw.total})
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${sw.pct >= 85 ? 'bg-success' : sw.pct >= 75 ? 'bg-warning' : 'bg-danger'}`}
                      style={{ width: `${sw.pct}%` }}
                    />
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

function TeacherDashboard({ userId }: { userId: string }) {
  const today = new Date().toISOString().split('T')[0];
  const monday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const taughtClassIds = [...new Set(teacherMappings.filter(m => m.teacher_id === userId).map(m => m.class_id))];
  const teacherClasses = classes.filter(c => taughtClassIds.includes(c.id));

  const [selectedClass, setSelectedClass] = useState<string>(teacherClasses[0]?.id || '');
  const [mode, setMode] = useState<'date' | 'week'>('date');
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(monday);

  const filteredRecords = useMemo(() => {
    let recs = attendanceRecords.filter(r => r.teacher_id === userId);
    if (selectedClass) recs = recs.filter(r => r.class_id === selectedClass);

    if (mode === 'date') {
      return recs.filter(r => r.attendance_date === selectedDate);
    }

    const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd');
    return recs.filter(r => r.attendance_date >= weekStart && r.attendance_date <= weekEnd);
  }, [userId, selectedClass, mode, selectedDate, weekStart]);

  const sessions = new Set(filteredRecords.map(r => `${r.attendance_date}-${r.class_id}-${r.subject_id}`)).size;
  const present = filteredRecords.filter(r => r.status === 'present').length;
  const absent = filteredRecords.length - present;
  const pct = filteredRecords.length ? Math.round((present / filteredRecords.length) * 100) : 0;
  const classRisk = selectedClass ? getRiskDistribution(selectedClass) : getRiskDistribution();

  const trendData = useMemo(() => {
    const byDate = new Map<string, { present: number; total: number }>();
    filteredRecords.forEach((r) => {
      const entry = byDate.get(r.attendance_date) || { present: 0, total: 0 };
      entry.total += 1;
      if (r.status === 'present') entry.present += 1;
      byDate.set(r.attendance_date, entry);
    });
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, pct: Math.round((values.present / values.total) * 100) }));
  }, [filteredRecords]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Teacher Dashboard</h1>
        <p className="page-subtitle">
          View attendance by selected class and date range | Data range: {getDateRangeLabel(attendanceRecords)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="space-y-2">
          <Label>Select Class</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger>
            <SelectContent>
              {teacherClasses.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>View Mode</Label>
          <Select value={mode} onValueChange={(value) => setMode(value as 'date' | 'week')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date">By Date</SelectItem>
              <SelectItem value="week">By Week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === 'date' ? (
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Week Start (Mon)</Label>
            <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Sessions" value={sessions} icon={ClipboardCheck} subtitle={mode === 'date' ? selectedDate : `Week of ${weekStart}`} />
        <StatCard title="Present Entries" value={present} icon={BarChart3} />
        <StatCard title="Absent Entries" value={absent} icon={AlertTriangle} variant="danger" />
        <StatCard title="Attendance %" value={`${pct}%`} icon={TrendingUp} variant={pct >= 85 ? 'success' : pct >= 75 ? 'warning' : 'danger'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Selected Range Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="pct" stroke="hsl(175, 55%, 40%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Current Class Risk Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={[
                  { name: 'Safe', value: classRisk.safe },
                  { name: 'Moderate', value: classRisk.moderate },
                  { name: 'High Risk', value: classRisk.high },
                ]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
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
    </div>
  );
}

function ClassTeacherDashboard({ userId }: { userId: string }) {
  const cls = classes.find(c => c.class_teacher_id === userId);
  if (!cls) return <p>No class assigned</p>;
  const classData = getClassAnalytics(cls.id);
  const risk = getRiskDistribution(cls.id);
  const classRecords = attendanceRecords.filter(r => r.class_id === cls.id);
  const dateOptions = [...new Set(classRecords.map(r => r.attendance_date))].sort();
  const [selectedDate, setSelectedDate] = useState<string>(dateOptions[dateOptions.length - 1] || '');

  const selectedDateRecords = classRecords.filter(r => r.attendance_date === selectedDate);
  const sessions = new Set(selectedDateRecords.map(r => r.subject_id)).size;
  const present = selectedDateRecords.filter(r => r.status === 'present').length;
  const absent = selectedDateRecords.length - present;
  const attendancePct = selectedDateRecords.length > 0 ? Math.round((present / selectedDateRecords.length) * 100) : 0;

  const subjectSummary = Array.from(
    selectedDateRecords.reduce((map, record) => {
      const row = map.get(record.subject_id) || { subjectId: record.subject_id, present: 0, total: 0 };
      row.total += 1;
      if (record.status === 'present') row.present += 1;
      map.set(record.subject_id, row);
      return map;
    }, new Map<string, { subjectId: string; present: number; total: number }>()),
  ).map(([subjectId, row]) => ({
    subjectId,
    subjectName: subjects.find(s => s.id === subjectId)?.name || subjectId,
    present: row.present,
    total: row.total,
    pct: row.total > 0 ? Math.round((row.present / row.total) * 100) : 0,
  }));

  const subjectChartData = subjectSummary.map(summary => ({
    name: summary.subjectName,
    pct: summary.pct,
  }));

  const studentDateData = students
    .filter(s => s.class_id === cls.id)
    .map(student => {
      const records = selectedDateRecords.filter(r => r.student_id === student.id);
      const presentCount = records.filter(r => r.status === 'present').length;
      return {
        student,
        present: presentCount,
        total: records.length,
        pct: records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0,
      };
    });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Class Teacher Dashboard</h1>
        <p className="page-subtitle">
          {cls.name} - Semester {cls.semester} | Data range: {getDateRangeLabel(classRecords)}
        </p>
      </div>
      <div className="mb-4 max-w-xs">
        <Label className="mb-2 block">Select Date</Label>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={dateOptions[0]}
          max={dateOptions[dateOptions.length - 1]}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Sessions (Date)" value={sessions} icon={ClipboardCheck} subtitle={selectedDate} />
        <StatCard title="Present Entries" value={present} icon={Users} variant="success" />
        <StatCard title="Absent Entries" value={absent} icon={AlertTriangle} variant="danger" />
        <StatCard title="Attendance %" value={`${attendancePct}%`} icon={TrendingUp} variant={attendancePct >= 85 ? 'success' : attendancePct >= 75 ? 'warning' : 'danger'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Overall Class Risk Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={[
                  { name: 'Safe', value: risk.safe },
                  { name: 'Moderate', value: risk.moderate },
                  { name: 'High Risk', value: risk.high },
                ]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
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

        <Card>
          <CardHeader><CardTitle className="text-base">Subject Attendance for {selectedDate}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={subjectChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="pct" fill="hsl(175, 55%, 40%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Student Details for {selectedDate}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Roll No</th>
                  <th className="pb-2 font-medium text-muted-foreground">Name</th>
                  <th className="pb-2 font-medium text-muted-foreground">Present / Total</th>
                  <th className="pb-2 font-medium text-muted-foreground">Date %</th>
                  <th className="pb-2 font-medium text-muted-foreground">Overall Risk</th>
                </tr>
              </thead>
              <tbody>
                {studentDateData.map(d => (
                  <tr key={d.student.id} className="border-b last:border-0">
                    <td className="py-2.5 font-mono text-xs">{d.student.roll_number}</td>
                    <td className="py-2.5 font-medium">{d.student.name}</td>
                    <td className="py-2.5">
                      <span className="font-semibold">
                        {d.present}/{d.total}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`text-xs ${d.pct >= 85 ? 'text-success' : d.pct >= 75 ? 'text-warning' : 'text-danger'}`}>
                        {d.pct}%
                      </span>
                    </td>
                    <td className="py-2.5"><RiskBadge level={classData.find(c => c.student.id === d.student.id)?.analytics?.risk_level || 'safe'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HODDashboard() {
  const risk = getRiskDistribution();
  const facultyUsers = users.filter(u => u.role === 'teacher' || u.role === 'class_teacher');
  const classComparison = classes.map(c => {
    const cRisk = getRiskDistribution(c.id);
    const cStudents = students.filter(s => s.class_id === c.id);
    const avgPct = cStudents.reduce((sum, s) => {
      const a = analyticsCache.find(ac => ac.student_id === s.id);
      return sum + (a?.overall_pct || 0);
    }, 0) / (cStudents.length || 1);
    return { id: c.id, name: c.name, avgPct: Math.round(avgPct), students: cStudents.length, ...cRisk };
  });

  // Derive default date range from available attendance records
  const allDates = attendanceRecords.map(r => r.attendance_date).sort();
  const defaultStart = allDates[0] ?? new Date().toISOString().split('T')[0];
  const defaultEnd = allDates[allDates.length - 1] ?? defaultStart;

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [activeTab, setActiveTab] = useState<'faculty' | 'class' | 'subject' | 'defaulters'>('faculty');
  const [selectedClassStats, setSelectedClassStats] = useState<string>(classes[0]?.id ?? '');
  const [selectedDefaulterClass, setSelectedDefaulterClass] = useState<string>(classes[0]?.id ?? '');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>(facultyUsers[0]?.id ?? '');

  const filteredRecords = useMemo(() => {
    if (!startDate || !endDate) return attendanceRecords;
    return attendanceRecords.filter(
      r => r.attendance_date >= startDate && r.attendance_date <= endDate,
    );
  }, [startDate, endDate]);

  // Faculty-wise (teacher-wise) trend data
  const facultyTrendConfig = useMemo(() => {
    const teacherIds = Array.from(
      new Set(filteredRecords.map(r => r.teacher_id)),
    );
    const teacherList = teacherIds
      .map(id => users.find(u => u.id === id && (u.role === 'teacher' || u.role === 'class_teacher')))
      .filter((u): u is typeof users[number] => !!u);

    const byDateTeacher = new Map<string, Map<string, { present: number; total: number }>>();
    filteredRecords.forEach(r => {
      if (!r.teacher_id) return;
      const dateKey = r.attendance_date;
      let dateMap = byDateTeacher.get(dateKey);
      if (!dateMap) {
        dateMap = new Map();
        byDateTeacher.set(dateKey, dateMap);
      }
      const entry = dateMap.get(r.teacher_id) || { present: 0, total: 0 };
      entry.total += 1;
      if (r.status === 'present') entry.present += 1;
      dateMap.set(r.teacher_id, entry);
    });

    const sortedDates = Array.from(byDateTeacher.keys()).sort();
    const data = sortedDates.map(date => {
      const dateMap = byDateTeacher.get(date)!;
      const row: Record<string, number | string | null> = { date };
      teacherList.forEach(t => {
        const entry = dateMap.get(t.id) || { present: 0, total: 0 };
        row[t.name] = entry.total ? Math.round((entry.present / entry.total) * 100) : null;
      });
      return row;
    });

    return { teachers: teacherList, data };
  }, [filteredRecords]);

  const selectedFaculty = facultyUsers.find(f => f.id === selectedFacultyId);

  const selectedFacultyRecords = useMemo(
    () => filteredRecords.filter(r => r.teacher_id === selectedFacultyId),
    [filteredRecords, selectedFacultyId],
  );

  const selectedFacultyClassStats = useMemo(() => {
    if (!selectedFacultyId) return [];
    const mappedClassIds = teacherMappings
      .filter(m => m.teacher_id === selectedFacultyId)
      .map(m => m.class_id);
    const recordClassIds = selectedFacultyRecords.map(r => r.class_id);
    const classIds = Array.from(new Set([...mappedClassIds, ...recordClassIds]));

    return classIds.map(classId => {
      const classInfo = classes.find(c => c.id === classId);
      const records = selectedFacultyRecords.filter(r => r.class_id === classId);
      const present = records.filter(r => r.status === 'present').length;
      const total = records.length;
      const pct = total ? Math.round((present / total) * 100) : 0;
      const sessions = new Set(records.map(r => `${r.attendance_date}-${r.subject_id}`)).size;
      return {
        classId,
        className: classInfo?.name ?? classId,
        sessions,
        present,
        total,
        pct,
      };
    }).sort((a, b) => a.className.localeCompare(b.className));
  }, [selectedFacultyId, selectedFacultyRecords]);

  const selectedFacultySubjectStats = useMemo(() => {
    if (!selectedFacultyId) return [];
    const mappedSubjectIds = teacherMappings
      .filter(m => m.teacher_id === selectedFacultyId)
      .map(m => m.subject_id);
    const recordSubjectIds = selectedFacultyRecords.map(r => r.subject_id);
    const subjectIds = Array.from(new Set([...mappedSubjectIds, ...recordSubjectIds]));

    return subjectIds.map(subjectId => {
      const subjectInfo = subjects.find(s => s.id === subjectId);
      const records = selectedFacultyRecords.filter(r => r.subject_id === subjectId);
      const present = records.filter(r => r.status === 'present').length;
      const total = records.length;
      const pct = total ? Math.round((present / total) * 100) : 0;
      const sessions = new Set(records.map(r => `${r.attendance_date}-${r.class_id}`)).size;
      return {
        subjectId,
        subjectName: subjectInfo?.name ?? subjectId,
        sessions,
        present,
        total,
        pct,
      };
    }).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [selectedFacultyId, selectedFacultyRecords]);

  // Class-wise trend data
  const classTrendData = useMemo(() => {
    const byDateClass = new Map<string, Map<string, { present: number; total: number }>>();
    filteredRecords.forEach(r => {
      const dateKey = r.attendance_date;
      let dateMap = byDateClass.get(dateKey);
      if (!dateMap) {
        dateMap = new Map();
        byDateClass.set(dateKey, dateMap);
      }
      const entry = dateMap.get(r.class_id) || { present: 0, total: 0 };
      entry.total += 1;
      if (r.status === 'present') entry.present += 1;
      dateMap.set(r.class_id, entry);
    });

    const sortedDates = Array.from(byDateClass.keys()).sort();
    return sortedDates.map(date => {
      const dateMap = byDateClass.get(date)!;
      const row: Record<string, number | string | null> = { date };
      classComparison.forEach(c => {
        const entry = dateMap.get(c.id) || { present: 0, total: 0 };
        row[c.name] = entry.total ? Math.round((entry.present / entry.total) * 100) : null;
      });
      return row;
    });
  }, [filteredRecords, classComparison]);

  // Subject-wise stats over selected range
  const subjectStats = useMemo(() => {
    const map = new Map<string, { present: number; total: number }>();
    filteredRecords.forEach(r => {
      const entry = map.get(r.subject_id) || { present: 0, total: 0 };
      entry.total += 1;
      if (r.status === 'present') entry.present += 1;
      map.set(r.subject_id, entry);
    });
    return Array.from(map.entries()).map(([subjectId, { present, total }]) => {
      const subj = subjects.find(s => s.id === subjectId);
      const pct = total ? Math.round((present / total) * 100) : 0;
      return {
        id: subjectId,
        name: subj?.name ?? subjectId,
        present,
        total,
        pct,
      };
    });
  }, [filteredRecords]);

  // Defaulter students per class (based on selected date range, threshold < 75%)
  const defaulterClassOptions = useMemo(
    () => classes.filter(c => students.some(s => s.class_id === c.id)),
    [],
  );

  const defaulters = useMemo(() => {
    if (!selectedDefaulterClass) return [];
    const classStudents = students.filter(s => s.class_id === selectedDefaulterClass);
    const classRecs = filteredRecords.filter(r => r.class_id === selectedDefaulterClass);

    return classStudents.map(student => {
      const stuRecs = classRecs.filter(r => r.student_id === student.id);
      if (stuRecs.length === 0) return null;
      const present = stuRecs.filter(r => r.status === 'present').length;
      const pct = Math.round((present / stuRecs.length) * 100);
      if (pct >= 75) return null;
      const a = analyticsCache.find(ac => ac.student_id === student.id);
      return {
        student,
        present,
        total: stuRecs.length,
        pct,
        risk: a?.risk_level ?? (pct >= 85 ? 'safe' : pct >= 75 ? 'moderate' : 'high'),
      };
    }).filter((x): x is NonNullable<typeof x> => !!x);
  }, [filteredRecords, selectedDefaulterClass]);

  const selectedClassName = classes.find(c => c.id === selectedClassStats)?.name || '-';
  const selectedClassStudents = useMemo(() => {
    const classStudents = students.filter(s => s.class_id === selectedClassStats);
    return classStudents.map(student => ({
      student,
      analytics: analyticsCache.find(a => a.student_id === student.id),
    }));
  }, [selectedClassStats]);

  const selectedClassSafe = selectedClassStudents.filter(s => (s.analytics?.risk_level || 'safe') === 'safe');
  const selectedClassRisk = selectedClassStudents.filter(s => (s.analytics?.risk_level || 'safe') !== 'safe');

  const handleDownloadDefaultersPdf = () => {
    const selectedClassNameForPdf = classes.find(c => c.id === selectedDefaulterClass)?.name || selectedDefaulterClass;
    downloadTablePdf({
      filename: `hod-defaulters-${selectedClassNameForPdf.replace(/\s+/g, '-')}-${startDate}-${endDate}.pdf`,
      title: 'HOD Defaulter List',
      subtitleLines: [
        `Class: ${selectedClassNameForPdf}`,
        `Date Range: ${startDate} to ${endDate}`,
        `Defaulter Threshold: Attendance < 75%`,
        `Total Defaulters: ${defaulters.length}`,
      ],
      headers: ['Roll No', 'Student Name', 'Present / Total', 'Attendance %', 'Risk'],
      rows: defaulters.map(d => [
        d.student.roll_number,
        d.student.name,
        `${d.present}/${d.total}`,
        `${d.pct}%`,
        String(d.risk).toUpperCase(),
      ]),
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">HOD Dashboard</h1>
        <p className="page-subtitle">
          Department-wide attendance analytics. Use the controls below to switch between faculty, class, subject, and defaulter views.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <Label>From Date</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>To Date</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="faculty">Faculty Wise Stats</TabsTrigger>
          <TabsTrigger value="class">Class Wise Stats</TabsTrigger>
          <TabsTrigger value="subject">Subject Wise Stats</TabsTrigger>
          <TabsTrigger value="defaulters">Defaulter List</TabsTrigger>
        </TabsList>

      <TabsContent value="faculty">
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Select Faculty</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {facultyUsers.map(f => (
                <Button
                  key={f.id}
                  type="button"
                  variant={selectedFacultyId === f.id ? 'default' : 'outline'}
                  onClick={() => setSelectedFacultyId(f.id)}
                >
                  {f.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Faculty-wise Attendance Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={facultyTrendConfig.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {facultyTrendConfig.teachers.map((t, idx) => (
                    <Line
                      key={t.id}
                      type="monotone"
                      dataKey={t.name}
                      stroke={['#2563eb', '#16a34a', '#f97316', '#ec4899', '#06b6d4'][idx % 5]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Department Risk Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={[
                    { name: 'Safe', value: risk.safe },
                    { name: 'Moderate', value: risk.moderate },
                    { name: 'High Risk', value: risk.high },
                  ]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Class-wise Stats {selectedFaculty ? `- ${selectedFaculty.name}` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedFacultyClassStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">No class data for selected faculty in this date range.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium text-muted-foreground">Class</th>
                        <th className="pb-2 font-medium text-muted-foreground">Sessions</th>
                        <th className="pb-2 font-medium text-muted-foreground">Present / Total</th>
                        <th className="pb-2 font-medium text-muted-foreground">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFacultyClassStats.map(item => (
                        <tr key={item.classId} className="border-b last:border-0">
                          <td className="py-2.5 font-medium">{item.className}</td>
                          <td className="py-2.5">{item.sessions}</td>
                          <td className="py-2.5">{item.present}/{item.total}</td>
                          <td className="py-2.5 font-semibold">{item.total ? `${item.pct}%` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Subject-wise Stats {selectedFaculty ? `- ${selectedFaculty.name}` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedFacultySubjectStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subject data for selected faculty in this date range.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium text-muted-foreground">Subject</th>
                        <th className="pb-2 font-medium text-muted-foreground">Sessions</th>
                        <th className="pb-2 font-medium text-muted-foreground">Present / Total</th>
                        <th className="pb-2 font-medium text-muted-foreground">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFacultySubjectStats.map(item => (
                        <tr key={item.subjectId} className="border-b last:border-0">
                          <td className="py-2.5 font-medium">{item.subjectName}</td>
                          <td className="py-2.5">{item.sessions}</td>
                          <td className="py-2.5">{item.present}/{item.total}</td>
                          <td className="py-2.5 font-semibold">{item.total ? `${item.pct}%` : '-'}</td>
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
        <>
          <div className="mb-4 max-w-xs">
            <Label>Select Class</Label>
            <Select value={selectedClassStats} onValueChange={setSelectedClassStats}>
              <SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Class-wise Avg. Attendance</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={classComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="avgPct" name="Avg %" fill="hsl(220, 60%, 20%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Class-wise Attendance Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={classTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    {classComparison.map((c, idx) => (
                      <Line
                        key={c.id}
                        type="monotone"
                        dataKey={c.name}
                        stroke={['#4f46e5', '#22c55e', '#eab308', '#ef4444', '#0ea5e9'][idx % 5]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Safe Students - {selectedClassName}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm max-h-56 overflow-y-auto">
                  {selectedClassSafe.length === 0 ? (
                    <p className="text-muted-foreground">No safe students found.</p>
                  ) : selectedClassSafe.map(s => (
                    <p key={s.student.id}>{s.student.roll_number} - {s.student.name}</p>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Risk Students - {selectedClassName}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm max-h-56 overflow-y-auto">
                  {selectedClassRisk.length === 0 ? (
                    <p className="text-muted-foreground">No risk students found.</p>
                  ) : selectedClassRisk.map(s => (
                    <p key={s.student.id}>{s.student.roll_number} - {s.student.name}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Class Comparison</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Class</th>
                      <th className="pb-2 font-medium text-muted-foreground">Students</th>
                      <th className="pb-2 font-medium text-muted-foreground">Avg %</th>
                      <th className="pb-2 font-medium text-muted-foreground">Safe</th>
                      <th className="pb-2 font-medium text-muted-foreground">Moderate</th>
                      <th className="pb-2 font-medium text-muted-foreground">High Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classComparison.map(c => (
                      <tr key={c.name} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{c.name}</td>
                        <td className="py-2.5">{c.students}</td>
                        <td className="py-2.5 font-semibold">{c.avgPct}%</td>
                        <td className="py-2.5 text-success">{c.safe}</td>
                        <td className="py-2.5 text-warning">{c.moderate}</td>
                        <td className="py-2.5 text-danger">{c.high}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      </TabsContent>

      <TabsContent value="subject">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Subject-wise Attendance (%)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={subjectStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="pct" name="Attendance %" fill="hsl(175, 55%, 40%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Subject Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Subject</th>
                      <th className="pb-2 font-medium text-muted-foreground">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectStats.map(s => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{s.name}</td>
                        <td className="py-2.5 font-semibold">{s.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="defaulters">
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Select Class</Label>
              <Select
                value={selectedDefaulterClass}
                onValueChange={value => setSelectedDefaulterClass(value)}
              >
                <SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger>
                <SelectContent>
                  {defaulterClassOptions.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-end justify-end">
              <Button variant="outline" onClick={handleDownloadDefaultersPdf}>
                Download Defaulter List PDF
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Defaulter Students (Attendance &lt; 75%)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Roll No</th>
                      <th className="pb-2 font-medium text-muted-foreground">Name</th>
                      <th className="pb-2 font-medium text-muted-foreground">Present / Total</th>
                      <th className="pb-2 font-medium text-muted-foreground">%</th>
                      <th className="pb-2 font-medium text-muted-foreground">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaulters.map(d => (
                      <tr key={d.student.id} className="border-b last:border-0">
                        <td className="py-2.5 font-mono text-xs">{d.student.roll_number}</td>
                        <td className="py-2.5 font-medium">{d.student.name}</td>
                        <td className="py-2.5">
                          {d.present}/{d.total}
                        </td>
                        <td className="py-2.5 font-semibold">{d.pct}%</td>
                        <td className="py-2.5">
                          <RiskBadge level={d.risk} />
                        </td>
                      </tr>
                    ))}
                    {defaulters.length === 0 && (
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
        </>
      </TabsContent>
      </Tabs>
    </div>
  );
}
