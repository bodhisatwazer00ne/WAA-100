import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, BookOpen, AlertTriangle, GraduationCap } from 'lucide-react';

const COLORS = { safe: '#22c55e', moderate: '#eab308', high: '#ef4444' };

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
  present: number;
  total: number;
}

export default function DepartmentAnalyticsPage() {
  const [summary, setSummary] = useState<DepartmentSummaryRow[]>([]);
  const [risk, setRisk] = useState<RiskDistribution>({ safe: 0, moderate: 0, high: 0, total: 0 });
  const [subjects, setSubjects] = useState<SubjectPerformanceRow[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [summaryRows, riskDist, subjectRows] = await Promise.all([
          apiRequest<DepartmentSummaryRow[]>('/api/analytics/department/summary'),
          apiRequest<RiskDistribution>('/api/analytics/risk-distribution'),
          apiRequest<SubjectPerformanceRow[]>('/api/analytics/department/subject-performance'),
        ]);
        setSummary(summaryRows);
        setRisk(riskDist);
        setSubjects(subjectRows);
      } catch {
        setSummary([]);
      }
    })();
  }, []);

  const totalStudents = useMemo(() => summary.reduce((sum, row) => sum + row.students, 0), [summary]);
  const safeRate = useMemo(() => (risk.total ? Math.round((risk.safe / risk.total) * 100) : 0), [risk]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Department Analytics</h1>
        <p className="page-subtitle">CSE Department - Overall Performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Students" value={totalStudents} icon={Users} />
        <StatCard title="Classes" value={summary.length} icon={BookOpen} />
        <StatCard title="High Risk" value={risk.high} icon={AlertTriangle} variant="danger" />
        <StatCard title="Safe Rate" value={`${safeRate}%`} icon={GraduationCap} variant="success" />
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
              <BarChart data={summary}>
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
            <BarChart data={subjects.map(subject => ({ name: subject.code, pct: subject.pct }))}>
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
