'use client';

import { useEffect, useState } from 'react';
import { SurveyResponse, SurveyResult } from '@/types/survey';
import { computeSurveyResult, isSurveyComplete } from './survey-scoring';

const responseKey = (vendorId: string) => `ccm-survey-response:${vendorId}`;
const resultKey = (vendorId: string) => `ccm-survey-result:${vendorId}`;

export function getStoredResult(vendorId: string): SurveyResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(resultKey(vendorId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredResponse(vendorId: string): SurveyResponse {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(responseKey(vendorId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function useSurveyStore(vendorId: string) {
  const [response, setResponse] = useState<SurveyResponse>({});
  const [result, setResult] = useState<SurveyResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedResponse = localStorage.getItem(responseKey(vendorId));
      const storedResult = localStorage.getItem(resultKey(vendorId));
      if (storedResponse) setResponse(JSON.parse(storedResponse));
      if (storedResult) setResult(JSON.parse(storedResult));
    } catch {
      // ignore malformed/local storage errors, start fresh
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const updateAnswer = (questionId: string, optionId: string) => {
    setResponse((prev) => {
      const next = { ...prev, [questionId]: optionId };
      try {
        localStorage.setItem(responseKey(vendorId), JSON.stringify(next));
      } catch {
        // ignore storage write errors
      }
      return next;
    });
  };

  const submit = () => {
    if (!isSurveyComplete(response)) return null;
    const computed = computeSurveyResult(vendorId, response);
    setResult(computed);
    try {
      localStorage.setItem(resultKey(vendorId), JSON.stringify(computed));
    } catch {
      // ignore storage write errors
    }
    return computed;
  };

  const reset = () => {
    setResponse({});
    setResult(null);
    try {
      localStorage.removeItem(responseKey(vendorId));
      localStorage.removeItem(resultKey(vendorId));
    } catch {
      // ignore
    }
  };

  return { response, result, loaded, updateAnswer, submit, reset };
}
