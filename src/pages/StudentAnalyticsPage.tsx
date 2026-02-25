import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { RiskBadge } from '@/components/RiskBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ClassRow {
  id: string;
  name: string;
  semester: number;
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
  } | null;
}

export default function StudentAnalyticsPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [classData, setClassData] = useState<ClassAnalyticsRow[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await apiRequest<ClassRow[]>('/api/analytics/classes');
        setClasses(rows);
        if (rows.length > 0) setSelectedClass(rows[0].id);
      } catch {
        setClasses([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setClassData([]);
      return;
    }
    void (async () => {
      try {
        const rows = await apiRequest<ClassAnalyticsRow[]>(`/api/analytics/class/${selectedClass}`);
        setClassData(rows);
      } catch {
        setClassData([]);
      }
    })();
  }, [selectedClass]);

  const chartData = useMemo(() => {
    return classData.map(row => ({
      name: row.student.name.split(' ')[0],
      pct: row.analytics?.overallPct ?? 0,
    }));
  }, [classData]);

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
            {classes.map(classRow => <SelectItem key={classRow.id} value={classRow.id}>{classRow.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Attendance Distribution</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
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
                {classData.map(row => (
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
