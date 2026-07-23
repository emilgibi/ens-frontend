'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PARAMETER_CONFIGS } from '@/components/continuous-monitoring/parameter-badge';
import { MonitoringReportRow } from '@/types/ccm';

export default function MonitoringReport({ rows }: { rows: MonitoringReportRow[] }) {
  const totals = rows.reduce(
    (acc, r) => ({
      alertsRaised: acc.alertsRaised + r.alertsRaised,
      high: acc.high + r.high,
      medium: acc.medium + r.medium,
      low: acc.low + r.low,
    }),
    { alertsRaised: 0, high: 0, medium: 0, low: 0 },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monitoring Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Parameter</TableHead>
                <TableHead className="text-center">Alerts Raised</TableHead>
                <TableHead className="text-center">High</TableHead>
                <TableHead className="text-center">Medium</TableHead>
                <TableHead className="text-center">Low</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.parameter}>
                  <TableCell className="font-medium">{PARAMETER_CONFIGS[r.parameter].label}</TableCell>
                  <TableCell className="text-center">{r.alertsRaised}</TableCell>
                  <TableCell className="text-center">{r.high}</TableCell>
                  <TableCell className="text-center">{r.medium}</TableCell>
                  <TableCell className="text-center">{r.low}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-center">{totals.alertsRaised}</TableCell>
                <TableCell className="text-center">{totals.high}</TableCell>
                <TableCell className="text-center">{totals.medium}</TableCell>
                <TableCell className="text-center">{totals.low}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
