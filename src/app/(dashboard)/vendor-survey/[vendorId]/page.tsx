'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { vendors } from '@/data/ccm-dummy/vendors';
import { useSurveyStore } from '@/lib/survey-store';
import SurveyForm from '@/components/vendor-survey/survey-form';
import SurveyResultPanel from '@/components/vendor-survey/survey-result';

export default function VendorSurveyPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = use(params);
  const vendor = vendors.find((v) => v.id === vendorId);
  const { response, result, loaded, updateAnswer, submit, reset } = useSurveyStore(vendorId);

  if (!vendor) notFound();
  if (!loaded) return null;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/vendor-survey"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Vendor Surveys
      </Link>

      <div>
        <h1 className="text-xl font-bold mb-1">{vendor.name}</h1>
        <p className="text-muted-foreground">{vendor.industry} · {vendor.country}</p>
      </div>

      <Separator className="my-1" />

      {result ? (
        <SurveyResultPanel result={result} onRetake={reset} />
      ) : (
        <SurveyForm response={response} onAnswer={updateAnswer} onSubmit={submit} />
      )}
    </div>
  );
}
