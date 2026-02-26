import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';

interface FacultyRow {
  teacherId: string;
  teacherProfileId: string;
  name: string;
  email: string;
  role: string;
  subjects: string[];
  classes: string[];
  classTeacherOf: string[];
  sessions: number;
}

export default function FacultyOverviewPage() {
  const [rows, setRows] = useState<FacultyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const response = await apiRequest<FacultyRow[]>('/api/reports/faculty-mapping');
        setRows(response);
      } catch {
        setError('Failed to load faculty mapping.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Faculty Mapping</h1>
        <p className="page-subtitle">Teacher-subject mapping and class-teacher assignments</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading faculty mapping...</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="p-3 text-left font-medium text-muted-foreground">Faculty</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Role</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Subjects</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Teaching Classes</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Class Teacher Of</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.teacherId} className="border-b last:border-0">
                      <td className="p-3 font-medium">{row.name}</td>
                      <td className="p-3 text-xs capitalize">{row.role.replace('_', ' ')}</td>
                      <td className="p-3 text-xs">{row.subjects.length > 0 ? row.subjects.join(', ') : '-'}</td>
                      <td className="p-3 text-xs">{row.classes.length > 0 ? row.classes.join(', ') : '-'}</td>
                      <td className="p-3 text-xs">{row.classTeacherOf.length > 0 ? row.classTeacherOf.join(', ') : '-'}</td>
                      <td className="p-3 font-semibold">{row.sessions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
