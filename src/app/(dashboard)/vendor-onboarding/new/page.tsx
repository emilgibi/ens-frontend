import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import OnboardingWizard from '@/components/vendor-onboarding/onboarding-wizard';

export default function NewOnboardingPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/vendor-onboarding"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Vendor Onboarding
      </Link>
      <div>
        <h1 className="text-xl font-bold mb-1">New Vendor Onboarding</h1>
        <p className="text-muted-foreground">
          Enter and verify GST, PAN, bank account, and MSME details before onboarding this vendor.
        </p>
      </div>
      <Separator className="my-1" />
      <OnboardingWizard />
    </div>
  );
}
