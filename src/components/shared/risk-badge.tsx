import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type RiskTier = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

const RISK_CONFIG: Record<RiskTier, { label: string; styles: string; dot: string }> = {
  LOW: {
    label: 'Low Risk',
    styles: 'bg-green-100 text-green-900 ring-green-600/20 dark:bg-green-950 dark:text-green-200',
    dot: 'bg-green-500',
  },
  MODERATE: {
    label: 'Moderate Risk',
    styles: 'bg-yellow-100 text-yellow-900 ring-yellow-600/20 dark:bg-yellow-950 dark:text-yellow-200',
    dot: 'bg-yellow-500',
  },
  HIGH: {
    label: 'High Risk',
    styles: 'bg-orange-100 text-orange-900 ring-orange-600/20 dark:bg-orange-950 dark:text-orange-200',
    dot: 'bg-orange-500',
  },
  CRITICAL: {
    label: 'Critical Risk',
    styles: 'bg-red-100 text-red-900 ring-red-600/20 dark:bg-red-950 dark:text-red-200',
    dot: 'bg-red-500',
  },
};

export const RISK_TIER_COLOR: Record<RiskTier, string> = {
  LOW: '#22c55e',
  MODERATE: '#eab308',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

export function RiskBadge({ tier, className }: { tier: RiskTier; className?: string }) {
  const config = RISK_CONFIG[tier];
  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-medium border-0 inline-flex items-center gap-1.5 ring-1 ring-inset',
        config.styles,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </Badge>
  );
}
