'use client';

import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/stat-card';
import { CheckCircle2, AlertTriangle, XCircle, Plus } from 'lucide-react';
import { useOnboardingRecords } from '@/lib/onboarding-store';
import OnboardingTable from '@/components/vendor-onboarding/onboarding-table';

export default function VendorOnboardingPage() {
  const { records, loaded } = useOnboardingRecords();

  const verified = records.filter((r) => r.overallStatus === 'VERIFIED').length;
  const needsReview = records.filter((r) => r.overallStatus === 'NEEDS_REVIEW').length;
  const rejected = records.filter((r) => r.overallStatus === 'REJECTED').length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold mb-1">Vendor Onboarding</h1>
          <p className="text-muted-foreground">
            GST, PAN, Bank Account, and MSME validation for new vendor onboarding.
          </p>
        </div>
        <Link href="/vendor-onboarding/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" /> New Onboarding
          </Button>
        </Link>
      </div>

      <Separator className="my-1" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Fully Verified" value={verified} icon={<CheckCircle2 className="h-4 w-4" />} description="All checks passed" />
        <StatCard title="Needs Review" value={needsReview} icon={<AlertTriangle className="h-4 w-4" />} description="One or more checks flagged" />
        <StatCard title="Rejected" value={rejected} icon={<XCircle className="h-4 w-4" />} description="Invalid or cancelled registration" />
      </div>

      {loaded && <OnboardingTable records={records} />}
    </div>
  );
}
