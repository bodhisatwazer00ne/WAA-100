import { useAuth } from '@/contexts/AuthContext';
import { attendanceRecords, classes, students, subjects } from '@/data/mockData';
import { getStudentAnalytics, getAttendanceTrend } from '@/services/attendanceService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RiskBadge } from '@/components/RiskBadge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MyAttendancePage() {
  const { user } = useAuth();
  const student = students.find(s => s.user_id === user?.id);
  if (!student) return <p>Student not found</p>;

  const analytics = getStudentAnalytics(student.id);
  const trend = getAttendanceTrend(student.id);
  const dateWiseRecords = attendanceRecords
    .filter(r => r.student_id === student.id)
    .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));

  if (!analytics) return <p>No analytics data</p>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Attendance</h1>
        <p className="page-subtitle">{student.name} - {student.roll_number}</p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl font-bold">{analytics.overall_pct}%</span>
        <RiskBadge level={analytics.risk_level} />
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
              {analytics.subject_wise.map(sw => (
                <div key={sw.subject_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{sw.subject_name}</span>
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
          {dateWiseRecords.length === 0 ? (
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
                  {dateWiseRecords.map((r) => {
                    const subjectName = subjects.find(s => s.id === r.subject_id)?.name || r.subject_id;
                    const className = classes.find(c => c.id === r.class_id)?.name || r.class_id;
                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-4">{r.attendance_date}</td>
                        <td className="py-2.5 pr-4">{subjectName}</td>
                        <td className="py-2.5 pr-4">{className}</td>
                        <td className={`py-2.5 font-medium ${r.status === 'present' ? 'text-success' : 'text-danger'}`}>
                          {r.status.toUpperCase()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
