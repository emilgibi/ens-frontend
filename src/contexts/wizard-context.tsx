import { createContext, useContext } from 'react';
import { ScreeningType } from '@/types';

export type WizardContextType = {
  activeStep: number;
  setActiveStep: (step: number) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  // Tracks which screening pipeline (Probe42 domestic / Moody's international)
  // the current wizard run is bound to. Set once via the entry popup and
  // read by every step + API call downstream.
  screeningType: ScreeningType | null;
  setScreeningType: (type: ScreeningType | null) => void;
};

export const WizardContext = createContext<WizardContextType | undefined>(
  undefined,
);

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx)
    throw new Error('useWizard must be used within a WizardContext.Provider');
  return ctx;
}
