import {
  LayoutDashboard, ClipboardCheck, FileText, BookOpen,
  AlertTriangle, GraduationCap, TrendingUp, Bell
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar';

const navItems = {
  teacher: [
    { title: 'Mark Attendance', url: '/attendance/mark', icon: ClipboardCheck },
    { title: 'Defaulter List', url: '/reports/defaulters', icon: AlertTriangle },
  ],
  hod: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Faculty Mapping', url: '/reports/faculty', icon: BookOpen },
  ],
  student: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'My Attendance', url: '/attendance/my', icon: ClipboardCheck },
    { title: 'Recovery Simulator', url: '/recovery', icon: TrendingUp },
    { title: 'Notifications', url: '/notifications', icon: Bell },
  ],
};

export function AppSidebar() {
  const { user } = useAuth();
  if (!user) return null;

  const items = user.role === 'teacher'
    ? [
        ...navItems.teacher,
        { title: "Your Class's Report", url: '/reports/merged', icon: FileText },
      ]
    : (navItems[user.role] || []);
  const roleLabel = user.role === 'hod' ? 'HOD' : user.role === 'teacher' ? 'Teacher' : 'Student';

  return (
    <Sidebar className="border-r-0">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-sidebar-primary" />
          <div>
            <div className="font-bold text-sidebar-primary-foreground text-lg">WAA-100</div>
            <div className="text-xs text-sidebar-foreground/60">{roleLabel} Panel</div>
          </div>
        </div>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
