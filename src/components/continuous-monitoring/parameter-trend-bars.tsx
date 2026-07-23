'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PARAMETER_CONFIGS } from '@/components/continuous-monitoring/parameter-badge';
import { ParameterTrendRow } from '@/lib/ccm-metrics';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

function DeltaChip({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600">
        <ArrowUp className="h-3 w-3" /> {delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600">
        <ArrowDown className="h-3 w-3" /> {Math.abs(delta)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
      <Minus className="h-3 w-3" /> 0
    </span>
  );
}

export default function ParameterTrendBars({ rows }: { rows: ParameterTrendRow[] }) {
  const maxCount = Math.max(1, ...rows.map((r) => Math.max(r.count, r.previousCount)));
  const sorted = [...rows].sort((a, b) => b.count - a.count);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parameter Trend (vs Last Period)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sorted.map((row) => {
          const config = PARAMETER_CONFIGS[row.source];
          const widthPct = (row.count / maxCount) * 100;
          return (
            <div key={row.source} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: config.chartColor }} />
                  {config.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{row.count} alerts</span>
                  <DeltaChip delta={row.delta} />
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all')}
                  style={{ width: `${widthPct}%`, backgroundColor: config.chartColor }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
