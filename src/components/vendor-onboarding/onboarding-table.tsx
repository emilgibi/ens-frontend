'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { OnboardingRecord } from '@/types/onboarding';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<OnboardingRecord['overallStatus'], string> = {
  VERIFIED: 'bg-green-100 text-green-800',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function OnboardingTable({ records }: { records: OnboardingRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarded Vendors</CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No vendors onboarded yet. Start a new onboarding to see it here.
          </p>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Company</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>PAN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={`/vendor-onboarding/${r.id}`} className="hover:underline">
                        {r.companyName}
                      </Link>
                    </TableCell>
                    <TableCell>{r.gstin}</TableCell>
                    <TableCell>{r.pan}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('border-0', STATUS_STYLES[r.overallStatus])}>
                        {r.overallStatus.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(r.submittedAt).toLocaleDateString('en-GB')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
