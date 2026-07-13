'use client';

import { useMemo, useState } from 'react';

import { WizardContext } from '@/contexts/wizard-context';
import { ScreeningType } from '@/types';

import ScreeningTypeDialog from './screening-type-dialog';
import Steps from './steps';

export default function StepsWrapper() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [screeningType, setScreeningType] = useState<ScreeningType | null>(
    null,
  );

  const value = useMemo(
    () => ({
      activeStep,
      setActiveStep,
      sessionId,
      setSessionId,
      screeningType,
      setScreeningType,
    }),
    [activeStep, setActiveStep, sessionId, setSessionId, screeningType, setScreeningType],
  );

  return (
    <WizardContext.Provider value={value}>
      {/* Mandatory gate: nothing in the wizard renders until the user picks
          domestic (Probe42) or international (Moody's). */}
      <ScreeningTypeDialog
        open={screeningType === null}
        onSelect={setScreeningType}
      />
      {screeningType !== null && <Steps />}
    </WizardContext.Provider>
  );
}
