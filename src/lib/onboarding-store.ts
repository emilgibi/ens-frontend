'use client';

import { useEffect, useState } from 'react';
import { OnboardingRecord } from '@/types/onboarding';

const LIST_KEY = 'ccm-onboarding-records';

export function getOnboardingRecords(): OnboardingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getOnboardingRecord(id: string): OnboardingRecord | undefined {
  return getOnboardingRecords().find((r) => r.id === id);
}

export function saveOnboardingRecord(record: OnboardingRecord) {
  const records = getOnboardingRecords();
  const idx = records.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.unshift(record);
  }
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(records));
  } catch {
    // ignore storage write errors
  }
}

export function useOnboardingRecords() {
  const [records, setRecords] = useState<OnboardingRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setRecords(getOnboardingRecords());
    setLoaded(true);
  }, []);

  return { records, loaded, refresh: () => setRecords(getOnboardingRecords()) };
}
