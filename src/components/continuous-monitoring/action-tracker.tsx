'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ActionTrackerItem } from '@/types/ccm';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<ActionTrackerItem['status'], string> = {
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  PENDING: 'bg-slate-100 text-slate-700',
  COMPLETED: 'bg-green-100 text-green-800',
};

export default function ActionTracker({ items }: { items: ActionTrackerItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Action Tracker</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Alert ID</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.alertId.toUpperCase()}</TableCell>
                  <TableCell>{item.action}</TableCell>
                  <TableCell>{item.assignedTo}</TableCell>
                  <TableCell>{new Date(item.dueDate).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('border-0', STATUS_STYLES[item.status])}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
