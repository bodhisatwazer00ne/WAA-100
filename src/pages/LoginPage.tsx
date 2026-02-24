import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/waa';
import { users } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap } from 'lucide-react';

const roleOptions: { role: UserRole; label: string }[] = [
  { role: 'teacher', label: 'Teacher' },
  { role: 'hod', label: 'HOD' },
  { role: 'student', label: 'Student' },
];

export default function LoginPage() {
  const { login, loginAs } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('teacher');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const rolePreview = useMemo(() => users.find(u => u.role === selectedRole), [selectedRole]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const ok = await login(email, password, selectedRole);
    if (!ok) setError('Invalid credentials or role mismatch for this user.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="h-10 w-10" />
            <span className="text-3xl font-bold tracking-tight">WAA-100</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Academic Attendance Monitoring System
          </h1>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">WAA-100</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Sign In</h2>
            <p className="text-muted-foreground mt-1">Enter your credentials or select a role to quick-login</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>Select Login Role</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map(option => (
                    <SelectItem key={option.role} value={option.role}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@university.edu" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="........" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Quick Role Login</span></div>
          </div>

          <div className="space-y-3">
            <Button variant="outline" className="w-full" onClick={() => loginAs(selectedRole)}>
              Login With Selected Role
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
