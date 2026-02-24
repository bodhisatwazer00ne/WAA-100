import { classes, students, analyticsCache } from '@/data/mockData';
import { getRiskDistribution } from '@/services/attendanceService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ClassComparisonPage() {
  const data = classes.map(c => {
    const risk = getRiskDistribution(c.id);
    const cStudents = students.filter(s => s.class_id === c.id);
    const avgPct = cStudents.reduce((sum, s) => {
      const a = analyticsCache.find(ac => ac.student_id === s.id);
      return sum + (a?.overall_pct || 0);
    }, 0) / (cStudents.length || 1);
    return { name: c.name, avgPct: Math.round(avgPct), safe: risk.safe, moderate: risk.moderate, high: risk.high };
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Class Comparison</h1>
        <p className="page-subtitle">Compare attendance performance across all classes</p>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Average Attendance by Class</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="avgPct" name="Avg %" fill="hsl(220, 60%, 20%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Risk Distribution by Class</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="safe" name="Safe" fill="#22c55e" stackId="a" />
              <Bar dataKey="moderate" name="Moderate" fill="#eab308" stackId="a" />
              <Bar dataKey="high" name="High Risk" fill="#ef4444" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
