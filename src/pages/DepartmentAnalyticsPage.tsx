import { classes, students, analyticsCache, subjects, attendanceRecords } from '@/data/mockData';
import { getRiskDistribution } from '@/services/attendanceService';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, BookOpen, AlertTriangle, GraduationCap } from 'lucide-react';

const COLORS = { safe: '#22c55e', moderate: '#eab308', high: '#ef4444' };

export default function DepartmentAnalyticsPage() {
  const risk = getRiskDistribution();
  
  const classComparison = classes.map(c => {
    const cStudents = students.filter(s => s.class_id === c.id);
    const avgPct = cStudents.reduce((sum, s) => {
      const a = analyticsCache.find(ac => ac.student_id === s.id);
      return sum + (a?.overall_pct || 0);
    }, 0) / (cStudents.length || 1);
    return { name: c.name, avgPct: Math.round(avgPct), students: cStudents.length };
  });

  // Subject-wise across dept
  const subjectPerf = subjects.map(sub => {
    const recs = attendanceRecords.filter(r => r.subject_id === sub.id);
    const present = recs.filter(r => r.status === 'present').length;
    return {
      name: sub.code,
      pct: recs.length > 0 ? Math.round((present / recs.length) * 100) : 0,
    };
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Department Analytics</h1>
        <p className="page-subtitle">CSE Department — Overall Performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Students" value={students.length} icon={Users} />
        <StatCard title="Classes" value={classes.length} icon={BookOpen} />
        <StatCard title="High Risk" value={risk.high} icon={AlertTriangle} variant="danger" />
        <StatCard title="Safe Rate" value={`${Math.round((risk.safe / risk.total) * 100)}%`} icon={GraduationCap} variant="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Risk Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={[
                  { name: 'Safe', value: risk.safe },
                  { name: 'Moderate', value: risk.moderate },
                  { name: 'High Risk', value: risk.high },
                ]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                  <Cell fill={COLORS.safe} />
                  <Cell fill={COLORS.moderate} />
                  <Cell fill={COLORS.high} />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Class-wise Average</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={classComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="avgPct" name="Avg %" fill="hsl(220, 60%, 20%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Subject-wise Performance</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={subjectPerf}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="pct" name="Attendance %" fill="hsl(175, 55%, 40%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
