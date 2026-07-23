import { RiskTier } from '@/components/shared/risk-badge';

export type SurveyCategory =
  | 'Financial Stability'
  | 'Operational Resilience'
  | 'Compliance & Regulatory'
  | 'Reputational & ESG'
  | 'Cybersecurity';

export interface SurveyOption {
  id: string;
  label: string;
  score: number; // 0 = lowest inherent risk, 3 = highest inherent risk
}

export interface SurveyQuestion {
  id: string;
  category: SurveyCategory;
  text: string;
  weight: number; // relative weight of this question in the overall score
  options: SurveyOption[];
}

// vendorId -> questionId -> selected optionId
export type SurveyResponse = Record<string, string>;

export interface CategoryBreakdown {
  category: SurveyCategory;
  score: number; // 0-100 normalized
  tier: RiskTier;
}

export interface SurveyResult {
  vendorId: string;
  overallScore: number; // 0-100 normalized
  overallTier: RiskTier;
  categoryBreakdown: CategoryBreakdown[];
  triggeredDetailedAssessment: boolean;
  completedAt: string; // ISO
}

export type SurveyStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
