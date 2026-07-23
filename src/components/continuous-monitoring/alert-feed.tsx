'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { ParameterBadge } from '@/components/continuous-monitoring/parameter-badge';
import { RiskBadge } from '@/components/shared/risk-badge';
import { AlertEvent } from '@/types/ccm';
import { cn } from '@/lib/utils';

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
}

export default function AlertFeed({
  alerts,
  title = 'Alerts & Updates',
  limit,
}: {
  alerts: AlertEvent[];
  title?: string;
  limit?: number;
}) {
  const items = limit ? alerts.slice(0, limit) : alerts;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5" />
          {title}
          {items.length > 0 && (
            <span className="text-xs ml-2 bg-muted px-2 py-1 rounded-full">{items.length} items</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <AlertTriangle className="mx-auto h-10 w-10 mb-4 opacity-70" />
            <p className="text-sm">No alerts yet.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-24 top-0 bottom-0 w-0.5 bg-border" />
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={cn(
                  'relative flex items-start pb-4 mb-8 last:mb-0',
                  idx === 0 && 'animate-in fade-in slide-in-from-top-2 duration-500',
                )}
              >
                <div className="w-24 flex-shrink-0 text-right pr-4 text-xs text-muted-foreground">
                  {formatDateTime(item.timestamp)}
                </div>
                <div className="relative flex-shrink-0 mx-4">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full border-2 border-background flex items-center justify-center -translate-x-3',
                      item.severity === 'CRITICAL' && 'bg-red-500',
                      item.severity === 'HIGH' && 'bg-orange-500',
                      item.severity === 'MODERATE' && 'bg-yellow-500',
                      item.severity === 'LOW' && 'bg-green-500',
                    )}
                  >
                    <AlertTriangle className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-card border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-medium text-muted-foreground">{item.vendorName}</span>
                      <div className="flex items-center gap-2">
                        <ParameterBadge source={item.source} />
                        <RiskBadge tier={item.severity} />
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Status: <span className="font-medium">{item.status.replace('_', ' ')}</span> · Assigned to{' '}
                      <span className="font-medium">{item.assignedTo}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
