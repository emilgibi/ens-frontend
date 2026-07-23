'use client';

import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { RiskBadge } from '@/components/shared/risk-badge';
import { vendors } from '@/data/ccm-dummy/vendors';
import { toast } from 'sonner';

export default function ContinuousMonitoringConfigurationPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(vendors.map((v) => [v.id, true])),
  );

  const handleSave = () => {
    toast.success('Configuration saved', {
      description: `${Object.values(enabled).filter(Boolean).length} vendors enrolled in continuous monitoring.`,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold mb-1">Configuration</h1>
        <p className="text-muted-foreground">
          Set up and configure which entities are tracked through continuous monitoring.
        </p>
      </div>
      <Separator className="my-1" />

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">Enable CM</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Current Tier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <Checkbox
                    checked={enabled[v.id]}
                    onCheckedChange={(value) => setEnabled((prev) => ({ ...prev, [v.id]: value === true }))}
                  />
                </TableCell>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell>{v.industry}</TableCell>
                <TableCell>
                  <RiskBadge tier={v.currentTier} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="w-full flex justify-end gap-4">
        <Button className="min-w-[100px]" onClick={handleSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
