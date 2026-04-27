import { Card } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  variant?: 'default' | 'warning' | 'danger';
}

const KPICard = ({ label, value, subtitle, icon: Icon, trend, variant = 'default' }: KPICardProps) => {
  const iconBg = variant === 'danger' ? 'bg-billing-at-risk/10' : variant === 'warning' ? 'bg-billing-warning/10' : 'bg-primary/10';
  const iconColor = variant === 'danger' ? 'text-billing-at-risk' : variant === 'warning' ? 'text-billing-warning' : 'text-primary';

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && <p className="text-xs text-billing-healthy font-medium">{trend}</p>}
        </div>
        <div className={`rounded-xl ${iconBg} p-3`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </Card>
  );
};

export default KPICard;
