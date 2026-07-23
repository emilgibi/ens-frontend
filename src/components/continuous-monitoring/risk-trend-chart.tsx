'use client';

import { ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, ReferenceArea } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AlertEvent, RiskTrendPoint } from '@/types/ccm';
import { RISK_TIER_COLOR } from '@/components/shared/risk-badge';

const TIER_BANDS = [
  { y1: 0, y2: 30, color: RISK_TIER_COLOR.LOW },
  { y1: 30, y2: 55, color: RISK_TIER_COLOR.MODERATE },
  { y1: 55, y2: 80, color: RISK_TIER_COLOR.HIGH },
  { y1: 80, y2: 100, color: RISK_TIER_COLOR.CRITICAL },
];

const SEVERITY_ORDER = { LOW: 0, MODERATE: 1, HIGH: 2, CRITICAL: 3 } as const;

export default function RiskTrendChart({
  data,
  alerts = [],
  portfolioTrend,
  title = 'Vendor Risk Trend (Last 12 Months)',
}: {
  data: RiskTrendPoint[];
  alerts?: AlertEvent[];
  portfolioTrend?: RiskTrendPoint[];
  title?: string;
}) {
  const latest = data[data.length - 1]?.score ?? 0;
  const color =
    latest >= 80 ? RISK_TIER_COLOR.CRITICAL : latest >= 55 ? RISK_TIER_COLOR.HIGH : latest >= 30 ? RISK_TIER_COLOR.MODERATE : RISK_TIER_COLOR.LOW;

  // Merge in the portfolio comparison line (same month order) and mark
  // months where a real alert landed, so spikes on the line are explained.
  const merged = data.map((point, idx) => {
    const monthAlerts = alerts.filter(
      (a) => new Date(a.timestamp).toLocaleString('en-US', { month: 'short' }) === point.month,
    );
    const worst = monthAlerts.length
      ? monthAlerts.reduce((a, b) => (SEVERITY_ORDER[b.severity] > SEVERITY_ORDER[a.severity] ? b : a))
      : null;

    return {
      ...point,
      portfolioScore: portfolioTrend?.[idx]?.score,
      marker: worst ? point.score : undefined,
      markerSeverity: worst?.severity,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-2xl font-bold" style={{ color }}>{latest}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="max-h-[240px] w-full">
          <ComposedChart data={merged} margin={{ left: -20, right: 12, top: 8, bottom: 0 }}>
            {TIER_BANDS.map((band) => (
              <ReferenceArea key={band.y1} y1={band.y1} y2={band.y2} fill={band.color} fillOpacity={0.07} strokeWidth={0} />
            ))}
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} width={30} />
            <ChartTooltip content={<ChartTooltipContent />} />

            {portfolioTrend && (
              <Line
                type="monotone"
                dataKey="portfolioScore"
                name="Portfolio Avg"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            )}

            <Line type="monotone" dataKey="score" name="Risk Score" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} />

            <Scatter
              dataKey="marker"
              name="Alert Event"
              shape={(props: any) => {
                const sevColor = RISK_TIER_COLOR[props.payload?.markerSeverity as keyof typeof RISK_TIER_COLOR] ?? color;
                if (props.payload?.marker === undefined) return <g />;
                return (
                  <circle cx={props.cx} cy={props.cy} r={6} fill={sevColor} stroke="var(--background)" strokeWidth={2} />
                );
              }}
            />
          </ComposedChart>
        </ChartContainer>
        <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            Risk score
          </div>
          {portfolioTrend && (
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 bg-slate-400" style={{ borderTop: '1.5px dashed #94a3b8', background: 'transparent' }} />
              Portfolio average
            </div>
          )}
          {alerts.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: color }} />
              Alert raised that month
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
