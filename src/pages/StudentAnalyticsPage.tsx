import { students, analyticsCache, classes } from '@/data/mockData';
import { getClassAnalytics, getRiskDistribution } from '@/services/attendanceService';
import { RiskBadge } from '@/components/RiskBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StudentAnalyticsPage() {
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id || '');
  const classData = getClassAnalytics(selectedClass);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Student Analytics</h1>
        <p className="page-subtitle">Subject-wise student performance analysis</p>
      </div>

      <div className="mb-6 max-w-xs">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
          <SelectContent>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Attendance Distribution</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={classData.map(d => ({
              name: d.student.name.split(' ')[0],
              pct: d.analytics?.overall_pct || 0,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="pct" name="Attendance %" fill="hsl(175, 55%, 40%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-3 text-left font-medium text-muted-foreground">Roll No</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Overall</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Risk</th>
                </tr>
              </thead>
              <tbody>
                {classData.map(d => (
                  <tr key={d.student.id} className="border-b last:border-0">
                    <td className="p-3 font-mono text-xs">{d.student.roll_number}</td>
                    <td className="p-3 font-medium">{d.student.name}</td>
                    <td className="p-3 font-semibold">{d.analytics?.overall_pct || 0}%</td>
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
