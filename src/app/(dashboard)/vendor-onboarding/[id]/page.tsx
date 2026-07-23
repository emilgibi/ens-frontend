'use client';

import { use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckStatusBadge } from '@/components/vendor-onboarding/check-status-badge';
import { getOnboardingRecord } from '@/lib/onboarding-store';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  VERIFIED: 'bg-green-100 text-green-800',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-red-100 text-red-800',
} as const;

export default function OnboardingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const record = getOnboardingRecord(id);

  if (!record) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/vendor-onboarding"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Vendor Onboarding
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold mb-1">{record.companyName}</h1>
          <p className="text-muted-foreground text-sm">
            Submitted {new Date(record.submittedAt).toLocaleString('en-GB')}
          </p>
        </div>
        <Badge variant="secondary" className={cn('border-0 text-sm', STATUS_STYLES[record.overallStatus])}>
          {record.overallStatus.replace('_', ' ')}
        </Badge>
      </div>

      <Separator className="my-1" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>GSTIN — {record.gstin}</span>
            <CheckStatusBadge status={record.gstResult.status} />
          </CardTitle>
        </CardHeader>
        {record.gstResult.status === 'VERIFIED' && (
          <CardContent className="text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Legal Name:</span> {record.gstResult.legalName}</p>
            <p><span className="font-medium text-foreground">Trade Name:</span> {record.gstResult.tradeName}</p>
            <p><span className="font-medium text-foreground">State:</span> {record.gstResult.state}</p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>PAN — {record.pan}</span>
            <CheckStatusBadge status={record.panResult.status} />
          </CardTitle>
        </CardHeader>
        {record.panResult.status === 'VERIFIED' && (
          <CardContent className="text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Name on Record:</span> {record.panResult.nameOnRecord}</p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>Bank Account — {record.bankAccountNumber} ({record.ifsc})</span>
            <CheckStatusBadge status={record.bankResult.status} />
          </CardTitle>
        </CardHeader>
        {record.bankResult.status === 'VERIFIED' && (
          <CardContent className="text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Bank:</span> {record.bankResult.bankName}</p>
            <p><span className="font-medium text-foreground">Branch:</span> {record.bankResult.branch}</p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>MSME / Udyam — {record.msmeNumber || '—'}</span>
            <CheckStatusBadge status={record.msmeResult.status} />
          </CardTitle>
        </CardHeader>
        {record.msmeResult.status === 'VERIFIED' && (
          <CardContent className="text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Enterprise:</span> {record.msmeResult.enterpriseName}</p>
            <p><span className="font-medium text-foreground">Category:</span> {record.msmeResult.category}</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
