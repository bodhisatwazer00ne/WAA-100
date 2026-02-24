import { useAuth } from '@/contexts/AuthContext';
import { classes, attendanceRecords } from '@/data/mockData';
import { getClassAnalytics, getRiskDistribution } from '@/services/attendanceService';
import { RiskBadge } from '@/components/RiskBadge';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, GraduationCap } from 'lucide-react';

export default function ClassAnalyticsPage() {
  const { user } = useAuth();
  const cls = classes.find(c => c.class_teacher_id === user?.id);
  if (!cls) return <p className="text-muted-foreground">No class assigned</p>;

  const classData = getClassAnalytics(cls.id);
  const risk = getRiskDistribution(cls.id);
  const classRecords = attendanceRecords.filter(r => r.class_id === cls.id);
  const classDates = classRecords.map(r => r.attendance_date).sort();
  const dateRangeLabel = classDates.length > 0
    ? `${classDates[0]} to ${classDates[classDates.length - 1]}`
    : 'No attendance records';

  const subjectAvgs = new Map<string, { total: number; count: number; name: string }>();
  classData.forEach(d => {
    d.analytics?.subject_wise.forEach(sw => {
      const entry = subjectAvgs.get(sw.subject_id) || { total: 0, count: 0, name: sw.subject_name };
      entry.total += sw.pct;
      entry.count++;
      subjectAvgs.set(sw.subject_id, entry);
    });
  });
  const subjectData = Array.from(subjectAvgs.entries()).map(([id, d]) => ({
    name: d.name.length > 15 ? `${d.name.substring(0, 15)}...` : d.name,
    avg: Math.round(d.total / d.count),
  }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Class Analytics - {cls.name}</h1>
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
                {classData
                  .sort((a, b) => (a.analytics?.overall_pct || 0) - (b.analytics?.overall_pct || 0))
                  .map(d => (
                    <tr key={d.student.id} className="border-b last:border-0">
                      <td className="p-3 font-mono text-xs">{d.student.roll_number}</td>
                      <td className="p-3 font-medium">{d.student.name}</td>
                      <td className="p-3 font-semibold">{d.analytics?.overall_pct}%</td>
                      <td className="p-3"><RiskBadge level={d.analytics?.risk_level || 'safe'} /></td>
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
