import { useWizard } from '@/contexts/wizard-context';
import Results from './results';

export default function ResultsWithSessionId() {
  const { sessionId, screeningType } = useWizard();

  return (
    <Results
      sessionId={sessionId as string}
      initialScreeningType={screeningType ?? undefined}
    />
  );
}