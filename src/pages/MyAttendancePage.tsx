import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RiskBadge } from '@/components/RiskBadge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StudentAnalyticsResponse {
  overallPct: number;
  subjectWise: { subjectId: string; subjectName: string; pct: number; attended: number; total: number }[];
  riskLevel: 'safe' | 'moderate' | 'high';
  weeklyAvg: number;
}

interface StudentAttendanceRecord {
  id: string;
  attendanceDate: string;
  status: 'present' | 'absent';
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
}

interface TrendPoint {
  date: string;
  pct: number;
}

function computeTrend(records: StudentAttendanceRecord[]): TrendPoint[] {
  if (records.length === 0) return [];

  const sorted = [...records].sort((a, b) => a.attendanceDate.localeCompare(b.attendanceDate));
  let cumulativeTotal = 0;
  let cumulativePresent = 0;
  return sorted.map(record => {
    cumulativeTotal += 1;
    if (record.status === 'present') cumulativePresent += 1;
    return {
      date: record.attendanceDate,
      pct: Math.round((cumulativePresent / cumulativeTotal) * 100),
    };
  });
}

export default function MyAttendancePage() {
  const { user } = useAuth();
  const studentProfileId = (user as any)?.profile_id as string | undefined;

  const [analytics, setAnalytics] = useState<StudentAnalyticsResponse | null>(null);
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentProfileId) {
      setError('Student profile not found. Please sign in again.');
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        setLoading(true);
        const [analyticsData, recordsData] = await Promise.all([
          apiRequest<StudentAnalyticsResponse>(`/api/analytics/student/${studentProfileId}`),
          apiRequest<StudentAttendanceRecord[]>(`/api/attendance/student/${studentProfileId}`),
        ]);
        setAnalytics(analyticsData);
        setRecords(recordsData);
      } catch (e) {
        console.error(e);
        setError('Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    })();
  }, [studentProfileId]);

  const trend = useMemo(() => computeTrend(records), [records]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading attendance...</p>;
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!analytics) return <p className="text-sm text-muted-foreground">No analytics data yet.</p>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Attendance</h1>
        <p className="page-subtitle">{user?.name}</p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl font-bold">{analytics.overallPct}%</span>
        <RiskBadge level={analytics.riskLevel} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
          <CardHeader><CardTitle className="text-base">Subject-wise Details</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.subjectWise.map(sw => (
                <div key={sw.subjectId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{sw.subjectName}</span>
                    <span className={`font-semibold ${sw.pct >= 85 ? 'text-success' : sw.pct >= 75 ? 'text-warning' : 'text-danger'}`}>
                      {sw.pct}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${sw.pct >= 85 ? 'bg-success' : sw.pct >= 75 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${sw.pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right">{sw.attended}/{sw.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Date-wise Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records found yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2.5 pr-4">Date</th>
                    <th className="py-2.5 pr-4">Subject</th>
                    <th className="py-2.5 pr-4">Class</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">{r.attendanceDate}</td>
                      <td className="py-2.5 pr-4">{r.subjectName}</td>
                      <td className="py-2.5 pr-4">{r.className}</td>
                      <td className={`py-2.5 font-medium ${r.status === 'present' ? 'text-success' : 'text-danger'}`}>
                        {r.status.toUpperCase()}
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

