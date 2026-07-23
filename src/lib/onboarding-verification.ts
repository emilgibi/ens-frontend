import { GstCheckResult, PanCheckResult, BankCheckResult, MsmeCheckResult } from '@/types/onboarding';
import { lookupBankName } from '@/data/onboarding-dummy/bank-codes';
import { lookupGstState } from '@/data/onboarding-dummy/gst-state-codes';

// --- Format regexes ---
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const BANK_ACCOUNT_REGEX = /^\d{9,18}$/;
export const MSME_REGEX = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Deterministic pseudo-random 0-1 derived from a string, so the same input
// always gives the same demo result on retry (no backend, so no real lookup).
function seededFraction(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

export async function verifyGstin(gstin: string): Promise<GstCheckResult> {
  await delay(900);
  if (!GSTIN_REGEX.test(gstin)) return { status: 'INVALID' };

  const frac = seededFraction(gstin);
  const stateCode = gstin.slice(0, 2);
  const state = lookupGstState(stateCode) ?? 'Unknown State';

  if (frac > 0.9) {
    return { status: 'CANCELLED', state };
  }
  return {
    status: 'VERIFIED',
    legalName: `Registered Entity ${gstin.slice(2, 7)}`,
    tradeName: `Trade Name ${gstin.slice(2, 6)}`,
    state,
    registrationDate: '2019-07-01',
  };
}

export async function verifyPan(pan: string, expectedName?: string): Promise<PanCheckResult> {
  await delay(700);
  if (!PAN_REGEX.test(pan)) return { status: 'INVALID' };

  const frac = seededFraction(pan);
  const nameOnRecord = expectedName?.trim() || `Registered Entity ${pan.slice(0, 5)}`;

  if (frac > 0.85) {
    return { status: 'MISMATCH', nameOnRecord: `Different Legal Entity ${pan.slice(0, 3)}` };
  }
  return { status: 'VERIFIED', nameOnRecord };
}

export async function verifyBankAccount(
  accountNumber: string,
  ifsc: string,
): Promise<BankCheckResult> {
  await delay(800);
  if (!BANK_ACCOUNT_REGEX.test(accountNumber) || !IFSC_REGEX.test(ifsc)) {
    return { status: 'INVALID' };
  }

  const bankName = lookupBankName(ifsc.slice(0, 4));
  if (!bankName) return { status: 'INVALID' };

  return {
    status: 'VERIFIED',
    bankName,
    branch: `${ifsc.slice(4)} Branch`,
  };
}

export async function verifyMsme(udyam: string): Promise<MsmeCheckResult> {
  await delay(750);
  if (!MSME_REGEX.test(udyam)) return { status: 'NOT_FOUND' };

  const frac = seededFraction(udyam);
  const category: 'Micro' | 'Small' | 'Medium' = frac < 0.6 ? 'Micro' : frac < 0.85 ? 'Small' : 'Medium';

  return {
    status: 'VERIFIED',
    category,
    enterpriseName: `Enterprise ${udyam.slice(-7)}`,
  };
}
