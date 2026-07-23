'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = [
  { label: 'Alert Raised' },
  { label: 'Level 1 Reviewer' },
  { label: 'Level 2 Manager' },
  { label: 'Level 3 Risk Head' },
];

const SLA_BUCKETS: { label: string; className: string }[] = [
  { label: '0-2 Days', className: 'bg-green-100 text-green-800' },
  { label: '2-4 Days', className: 'bg-amber-100 text-amber-800' },
  { label: '6+ Days', className: 'bg-red-100 text-red-800' },
];

export default function EscalationMatrix() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Escalation Matrix</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {STAGES.map((stage, idx) => (
            <div key={stage.label} className="flex items-center flex-1 min-w-[110px]">
              <div className="flex flex-col items-center gap-2">
                <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium text-center">{stage.label}</span>
              </div>
              {idx < STAGES.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground mx-3 shrink-0" />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground mr-1">SLA:</span>
          {SLA_BUCKETS.map((bucket) => (
            <span
              key={bucket.label}
              className={cn('rounded-md px-3 py-1 text-xs font-medium', bucket.className)}
            >
              {bucket.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
