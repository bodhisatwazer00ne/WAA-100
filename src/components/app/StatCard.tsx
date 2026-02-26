import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
  active?: boolean;
}

const variantStyles = {
  default: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default', onClick, active = false }: StatCardProps) {
  return (
    <Card
      className={`stat-card ${onClick ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''} ${active ? 'border-primary ring-1 ring-primary/40' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      } : undefined}
    >
      <CardContent className="p-0">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${variantStyles[variant]}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend !== undefined && (
              <p className={`text-xs font-medium ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% trend
              </p>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-muted ${variantStyles[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
