import { RiskTier } from '@/components/shared/risk-badge';
import { surveyQuestions } from '@/data/survey-dummy/questions';
import { CategoryBreakdown, SurveyCategory, SurveyResponse, SurveyResult } from '@/types/survey';

const MAX_OPTION_SCORE = 3;

function scoreToTier(normalized: number): RiskTier {
  if (normalized <= 25) return 'LOW';
  if (normalized <= 50) return 'MODERATE';
  if (normalized <= 75) return 'HIGH';
  return 'CRITICAL';
}

export function computeSurveyResult(vendorId: string, response: SurveyResponse): SurveyResult {
  const categories = Array.from(new Set(surveyQuestions.map((q) => q.category))) as SurveyCategory[];

  const categoryBreakdown: CategoryBreakdown[] = categories.map((category) => {
    const questions = surveyQuestions.filter((q) => q.category === category);
    let earned = 0;
    let max = 0;

    for (const q of questions) {
      const selectedOptionId = response[q.id];
      const selectedOption = q.options.find((o) => o.id === selectedOptionId);
      earned += (selectedOption?.score ?? 0) * q.weight;
      max += MAX_OPTION_SCORE * q.weight;
    }

    const normalized = max > 0 ? Math.round((earned / max) * 100) : 0;
    return { category, score: normalized, tier: scoreToTier(normalized) };
  });

  let totalEarned = 0;
  let totalMax = 0;
  for (const q of surveyQuestions) {
    const selectedOptionId = response[q.id];
    const selectedOption = q.options.find((o) => o.id === selectedOptionId);
    totalEarned += (selectedOption?.score ?? 0) * q.weight;
    totalMax += MAX_OPTION_SCORE * q.weight;
  }

  const overallScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
  const overallTier = scoreToTier(overallScore);

  return {
    vendorId,
    overallScore,
    overallTier,
    categoryBreakdown,
    triggeredDetailedAssessment: overallTier === 'HIGH' || overallTier === 'CRITICAL',
    completedAt: new Date().toISOString(),
  };
}

export function isSurveyComplete(response: SurveyResponse): boolean {
  return surveyQuestions.every((q) => !!response[q.id]);
}

export function surveyProgress(response: SurveyResponse): number {
  const answered = surveyQuestions.filter((q) => !!response[q.id]).length;
  return Math.round((answered / surveyQuestions.length) * 100);
}

export const RECOMMENDED_ACTIONS: Record<RiskTier, string[]> = {
  LOW: ['No further action required.', 'Continue with standard periodic re-screening.'],
  MODERATE: [
    'Flag for enhanced periodic monitoring.',
    'Request supporting documentation on flagged categories.',
  ],
  HIGH: [
    'Trigger a detailed risk assessment before onboarding or renewal.',
    'Escalate to procurement risk committee for review.',
    'Request remediation plan from vendor on flagged categories.',
  ],
  CRITICAL: [
    'Immediate detailed assessment required — do not proceed without sign-off.',
    'Escalate to senior stakeholders and legal/compliance.',
    'Consider alternate sourcing options pending resolution.',
  ],
};
