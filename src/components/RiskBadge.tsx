import type { RiskLevel } from '@/types/waa';
import { Badge } from '@/components/ui/badge';

const config: Record<RiskLevel, { label: string; className: string }> = {
  safe: { label: 'Safe (≥85%)', className: 'risk-safe border' },
  moderate: { label: 'Moderate (75-84%)', className: 'risk-moderate border' },
  high: { label: 'High Risk (<75%)', className: 'risk-high border' },
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const c = config[level];
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.className}`}>{c.label}</span>;
}
