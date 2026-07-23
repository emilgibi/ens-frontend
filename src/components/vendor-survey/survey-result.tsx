'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RiskBadge, RISK_TIER_COLOR } from '@/components/shared/risk-badge';
import { SurveyResult } from '@/types/survey';
import { RECOMMENDED_ACTIONS } from '@/lib/survey-scoring';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SurveyResultPanel({
  result,
  onRetake,
}: {
  result: SurveyResult;
  onRetake: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>Inherent Risk Score</span>
            <RiskBadge tier={result.overallTier} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span
              className="text-4xl font-bold tracking-tighter"
              style={{ color: RISK_TIER_COLOR[result.overallTier] }}
            >
              {result.overallScore}
            </span>
            <span className="text-muted-foreground text-sm">/ 100 inherent risk score</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Completed {new Date(result.completedAt).toLocaleString('en-GB')}
          </p>
        </CardContent>
      </Card>

      {result.triggeredDetailedAssessment ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Detailed Assessment Triggered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              This response profile crossed the High-Risk threshold. A detailed assessment is
              recommended before proceeding.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {RECOMMENDED_ACTIONS[result.overallTier].map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              No Detailed Assessment Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {RECOMMENDED_ACTIONS[result.overallTier].map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {result.categoryBreakdown.map((c) => (
            <div key={c.category}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">{c.category}</span>
                <span style={{ color: RISK_TIER_COLOR[c.tier] }}>{c.score}</span>
              </div>
              <Progress value={c.score} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onRetake}>
          Retake Survey
        </Button>
      </div>
    </div>
  );
}
