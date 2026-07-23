'use client';

import { useState, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RISK_TIER_COLOR, RiskTier } from '@/components/shared/risk-badge';
import { RiskSnapshot } from '@/types/ccm';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

const TIER_LABEL: Record<RiskTier, string> = {
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export default function RiskTimeline({ snapshots }: { snapshots: RiskSnapshot[] }) {
  const [activeIdx, setActiveIdx] = useState(snapshots.length - 1);
  const active = snapshots[activeIdx];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Score Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-center gap-1 overflow-x-auto pb-2">
          {snapshots.map((snap, idx) => (
            <Fragment key={snap.quarter}>
              <button
                onClick={() => setActiveIdx(idx)}
                className="flex flex-col items-center gap-1.5 group shrink-0 w-[92px]"
              >
                <div
                  className={cn(
                    'h-12 w-12 rounded-full flex items-center justify-center border-4 transition-transform group-hover:scale-110',
                    idx === activeIdx ? 'border-foreground' : 'border-transparent',
                  )}
                  style={{ backgroundColor: RISK_TIER_COLOR[snap.tier] + '33', color: RISK_TIER_COLOR[snap.tier] }}
                >
                  <span
                    className="h-6 w-6 rounded-full"
                    style={{ backgroundColor: RISK_TIER_COLOR[snap.tier] }}
                  />
                </div>
                <span className="text-xs font-medium" style={{ color: RISK_TIER_COLOR[snap.tier] }}>
                  {snap.quarter}
                </span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-1">
                  {snap.signals[0]}
                </span>
              </button>
              {idx < snapshots.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-4" />
              )}
            </Fragment>
          ))}
        </div>

        <div className="mt-4 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: RISK_TIER_COLOR[active.tier] }} />
            <span className="text-sm font-semibold">
              {active.quarter} — {TIER_LABEL[active.tier]} Risk
            </span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {active.signals.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-4 mt-4 flex-wrap">
          {(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as RiskTier[]).map((tier) => (
            <div key={tier} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: RISK_TIER_COLOR[tier] }} />
              {TIER_LABEL[tier]} Risk
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
