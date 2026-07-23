import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { CheckStatus } from '@/types/onboarding';
import { cn } from '@/lib/utils';

const CONFIG: Record<CheckStatus, { label: string; icon: any; className: string; spin?: boolean }> = {
  IDLE: { label: 'Not checked', icon: HelpCircle, className: 'bg-slate-50 text-slate-600 ring-slate-200' },
  CHECKING: { label: 'Checking...', icon: Loader2, className: 'bg-blue-50 text-blue-700 ring-blue-200', spin: true },
  VERIFIED: { label: 'Verified', icon: CheckCircle2, className: 'bg-green-50 text-green-700 ring-green-200' },
  MISMATCH: { label: 'Name Mismatch', icon: AlertTriangle, className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  INVALID: { label: 'Invalid Format', icon: XCircle, className: 'bg-red-50 text-red-700 ring-red-200' },
  CANCELLED: { label: 'Registration Cancelled', icon: XCircle, className: 'bg-red-50 text-red-700 ring-red-200' },
  NOT_FOUND: { label: 'Not Found', icon: XCircle, className: 'bg-red-50 text-red-700 ring-red-200' },
};

export function CheckStatusBadge({ status }: { status: CheckStatus }) {
  const config = CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge
      variant="secondary"
      className={cn('font-medium border-0 inline-flex items-center gap-1.5 ring-1 ring-inset', config.className)}
    >
      <Icon className={cn('h-3.5 w-3.5', config.spin && 'animate-spin')} />
      {config.label}
    </Badge>
  );
}
