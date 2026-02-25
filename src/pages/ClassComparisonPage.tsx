import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DepartmentSummaryRow {
  id: string;
  name: string;
  students: number;
  avgPct: number;
  safe: number;
  moderate: number;
  high: number;
}

export default function ClassComparisonPage() {
  const [rows, setRows] = useState<DepartmentSummaryRow[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiRequest<DepartmentSummaryRow[]>('/api/analytics/department/summary');
        setRows(data);
      } catch {
        setRows([]);
      }
    })();
  }, []);

  const data = useMemo(() => rows.map(row => ({
    name: row.name,
    avgPct: row.avgPct,
    safe: row.safe,
    moderate: row.moderate,
    high: row.high,
  })), [rows]);

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
