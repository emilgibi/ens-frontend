'use client';

import { Pie, PieChart, Cell, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PARAMETER_CONFIGS } from '@/components/continuous-monitoring/parameter-badge';
import { ParameterSlice } from '@/lib/ccm-metrics';

export default function ParameterDonut({ slices }: { slices: ParameterSlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.count, 0);
  const data = slices
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: PARAMETER_CONFIGS[s.source].label,
      value: s.count,
      percent: s.percent,
      fill: PARAMETER_CONFIGS[s.source].chartColor,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parameter-wise Risk View</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No alerts to break down yet.</p>
        ) : (
          <div className="relative">
            <ChartContainer config={{}} className="mx-auto aspect-square max-h-[240px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} strokeWidth={2}>
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold">{total}</span>
              <span className="text-xs text-muted-foreground">Total Alerts</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
              {data.map((d, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.fill }} />
                  {d.name} ({d.percent}%)
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
