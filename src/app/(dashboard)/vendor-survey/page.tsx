'use client';

import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { StatCard } from '@/components/shared/stat-card';
import { ClipboardList, ShieldAlert, TrendingUp, CheckCircle2 } from 'lucide-react';
import { vendors } from '@/data/ccm-dummy/vendors';
import { getStoredResult } from '@/lib/survey-store';
import { SurveyResult } from '@/types/survey';
import VendorSurveyTable from '@/components/vendor-survey/vendor-survey-table';

export default function VendorSurveyOverviewPage() {
  const [results, setResults] = useState<SurveyResult[]>([]);

  useEffect(() => {
    const collected = vendors
      .map((v) => getStoredResult(v.id))
      .filter((r): r is SurveyResult => !!r);
    setResults(collected);
  }, []);

  const completed = results.length;
  const triggered = results.filter((r) => r.triggeredDetailedAssessment).length;
  const avgScore = results.length
    ? Math.round(results.reduce((sum, r) => sum + r.overallScore, 0) / results.length)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold mb-1">Vendor Survey Module</h1>
        <p className="text-muted-foreground">
          Vendor risk surveys for inherent risk identification, with response-driven scoring and
          triggered detailed assessments for high-risk cases.
        </p>
      </div>

      <Separator className="my-1" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Surveys Completed"
          value={completed}
          icon={<CheckCircle2 className="h-4 w-4" />}
          description={`out of ${vendors.length} vendors`}
        />
        <StatCard
          title="Pending Surveys"
          value={vendors.length - completed}
          icon={<ClipboardList className="h-4 w-4" />}
          description="Not yet started"
        />
        <StatCard
          title="Detailed Assessments Triggered"
          value={triggered}
          icon={<ShieldAlert className="h-4 w-4" />}
          description="High or Critical inherent risk"
        />
        <StatCard
          title="Average Score"
          value={avgScore}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Across completed surveys"
        />
      </div>

      <VendorSurveyTable vendors={vendors} />
    </div>
  );
}
