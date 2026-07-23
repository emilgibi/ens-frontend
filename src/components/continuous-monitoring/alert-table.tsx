'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ParameterBadge } from '@/components/continuous-monitoring/parameter-badge';
import { RiskBadge } from '@/components/shared/risk-badge';
import { AlertEvent, AlertStatus } from '@/types/ccm';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<AlertStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-amber-100 text-amber-800',
  PENDING_REVIEW: 'bg-orange-100 text-orange-800',
  CLOSED: 'bg-green-100 text-green-800',
};

export default function AlertTable({ alerts, limit }: { alerts: AlertEvent[]; limit?: number }) {
  const rows = limit ? alerts.slice(0, limit) : alerts;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Parameter</TableHead>
                <TableHead>Trigger Event</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{new Date(a.timestamp).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell className="font-medium">{a.vendorName}</TableCell>
                  <TableCell>
                    <ParameterBadge source={a.source} />
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate" title={a.title}>
                    {a.title}
                  </TableCell>
                  <TableCell>
                    <RiskBadge tier={a.severity} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('border-0', STATUS_STYLES[a.status])}>
                      {a.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{a.assignedTo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
