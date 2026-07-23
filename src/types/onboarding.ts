export type CheckStatus = 'IDLE' | 'CHECKING' | 'VERIFIED' | 'MISMATCH' | 'INVALID' | 'CANCELLED' | 'NOT_FOUND';

export interface GstCheckResult {
  status: CheckStatus;
  legalName?: string;
  tradeName?: string;
  state?: string;
  registrationDate?: string;
}

export interface PanCheckResult {
  status: CheckStatus;
  nameOnRecord?: string;
}

export interface BankCheckResult {
  status: CheckStatus;
  bankName?: string;
  branch?: string;
}

export interface MsmeCheckResult {
  status: CheckStatus;
  category?: 'Micro' | 'Small' | 'Medium';
  enterpriseName?: string;
}

export type OverallOnboardingStatus = 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';

export interface OnboardingRecord {
  id: string;
  companyName: string;
  gstin: string;
  gstResult: GstCheckResult;
  pan: string;
  panResult: PanCheckResult;
  bankAccountNumber: string;
  ifsc: string;
  bankResult: BankCheckResult;
  msmeNumber: string;
  msmeResult: MsmeCheckResult;
  overallStatus: OverallOnboardingStatus;
  submittedAt: string;
}
