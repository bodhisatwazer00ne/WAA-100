import { useAuth } from '@/contexts/AuthContext';
import { notifications as allNotifications, students } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff } from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const student = students.find(s => s.user_id === user?.id);
  const notifs = student
    ? allNotifications.filter(n => n.student_id === student.id).sort((a, b) => b.created_at.localeCompare(a.created_at))
    : [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Notifications</h1>
        <p className="page-subtitle">Your absence alerts and updates</p>
      </div>

      {notifs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BellOff className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {notifs.map(n => (
            <Card key={n.id} className={n.read ? 'opacity-60' : ''}>
              <CardContent className="p-4 flex items-start gap-3">
                <Bell className={`h-4 w-4 mt-0.5 shrink-0 ${n.read ? 'text-muted-foreground' : 'text-danger'}`} />
                <div>
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
