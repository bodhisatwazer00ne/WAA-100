import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { RiskBadge } from '@/components/RiskBadge';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, GraduationCap } from 'lucide-react';

interface MyClassInfo {
  id: string;
  name: string;
  semester: number;
  totalStudents: number;
}

interface ClassAnalyticsRow {
  student: {
    id: string;
    name: string;
    rollNumber: string;
  };
  analytics: {
    overallPct: number;
    riskLevel: 'safe' | 'moderate' | 'high';
    subjectWise: {
      subjectId: string;
      subjectName: string;
      pct: number;
    }[];
  } | null;
}

interface RiskDistribution {
  safe: number;
  moderate: number;
  high: number;
  total: number;
}

export default function ClassAnalyticsPage() {
  const [myClass, setMyClass] = useState<MyClassInfo | null>(null);
  const [classData, setClassData] = useState<ClassAnalyticsRow[]>([]);
  const [risk, setRisk] = useState<RiskDistribution>({ safe: 0, moderate: 0, high: 0, total: 0 });
  const [dateRangeLabel, setDateRangeLabel] = useState('No attendance records');

  useEffect(() => {
    void (async () => {
      try {
        const cls = await apiRequest<MyClassInfo>('/api/reports/my-class');
        setMyClass(cls);
        const [analytics, riskDist, dates] = await Promise.all([
          apiRequest<ClassAnalyticsRow[]>(`/api/analytics/class/${cls.id}`),
          apiRequest<RiskDistribution>(`/api/analytics/risk-distribution?classId=${encodeURIComponent(cls.id)}`),
          apiRequest<string[]>('/api/reports/my-class/report-dates'),
        ]);
        setClassData(analytics);
        setRisk(riskDist);
        if (dates.length > 0) {
          setDateRangeLabel(`${dates[0]} to ${dates[dates.length - 1]}`);
        }
      } catch {
        setMyClass(null);
      }
    })();
  }, []);

  const subjectData = useMemo(() => {
    const map = new Map<string, { total: number; count: number; name: string }>();
    for (const row of classData) {
      const subjectWise = row.analytics?.subjectWise ?? [];
      for (const subject of subjectWise) {
        const current = map.get(subject.subjectId) ?? { total: 0, count: 0, name: subject.subjectName };
        current.total += subject.pct;
        current.count += 1;
        map.set(subject.subjectId, current);
      }
    }
    return Array.from(map.entries()).map(([, value]) => ({
      name: value.name.length > 15 ? `${value.name.substring(0, 15)}...` : value.name,
      avg: value.count > 0 ? Math.round(value.total / value.count) : 0,
    }));
  }, [classData]);

  if (!myClass) return <p className="text-muted-foreground">No class assigned</p>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Class Analytics - {myClass.name}</h1>
        <p className="page-subtitle">Comprehensive attendance analysis for your class | Date range: {dateRangeLabel}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Students" value={classData.length} icon={Users} />
        <StatCard title="Safe Students" value={risk.safe} icon={GraduationCap} variant="success" />
        <StatCard title="At Risk" value={risk.high + risk.moderate} icon={GraduationCap} variant="danger" />
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Subject-wise Average Attendance</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={subjectData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="avg" name="Avg %" fill="hsl(220, 60%, 20%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">All Students</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-3 text-left font-medium text-muted-foreground">Roll</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Overall %</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Risk</th>
                </tr>
              </thead>
              <tbody>
                {[...classData]
                  .sort((a, b) => (a.analytics?.overallPct ?? 0) - (b.analytics?.overallPct ?? 0))
                  .map(row => (
                    <tr key={row.student.id} className="border-b last:border-0">
                      <td className="p-3 font-mono text-xs">{row.student.rollNumber}</td>
                      <td className="p-3 font-medium">{row.student.name}</td>
                      <td className="p-3 font-semibold">{row.analytics?.overallPct ?? 0}%</td>
                      <td className="p-3"><RiskBadge level={row.analytics?.riskLevel ?? 'safe'} /></td>
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
