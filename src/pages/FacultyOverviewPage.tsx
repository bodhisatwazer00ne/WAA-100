import { users, teacherMappings, subjects, classes, attendanceRecords } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FacultyOverviewPage() {
  const teachers = users.filter(u => u.role === 'teacher');

  const facultyData = teachers.map(t => {
    const mappings = teacherMappings.filter(m => m.teacher_id === t.id);
    const subjectNames = [...new Set(mappings.map(m => subjects.find(s => s.id === m.subject_id)?.name || ''))];
    const classNames = [...new Set(mappings.map(m => classes.find(c => c.id === m.class_id)?.name || ''))];
    const classTeacherOf = classes.filter(c => c.class_teacher_id === t.id).map(c => c.name);
    const records = attendanceRecords.filter(r => r.teacher_id === t.id);
    const sessions = new Set(records.map(r => `${r.class_id}-${r.subject_id}-${r.attendance_date}`)).size;

    return { teacher: t, subjects: subjectNames, classes: classNames, classTeacherOf, sessions };
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Faculty Mapping</h1>
        <p className="page-subtitle">Teacher-subject mapping and class-teacher assignments</p>
      </div>

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
                {facultyData.map(f => (
                  <tr key={f.teacher.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{f.teacher.name}</td>
                    <td className="p-3 text-xs capitalize">{f.teacher.role.replace('_', ' ')}</td>
                    <td className="p-3 text-xs">{f.subjects.join(', ')}</td>
                    <td className="p-3 text-xs">{f.classes.join(', ')}</td>
                    <td className="p-3 text-xs">{f.classTeacherOf.length > 0 ? f.classTeacherOf.join(', ') : '-'}</td>
                    <td className="p-3 font-semibold">{f.sessions}</td>
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
