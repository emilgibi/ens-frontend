'use client';

import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper';
import { Badge } from '@/components/ui/badge';
import FileUpload from './file-upload';
import ReviewSubmission from './review-submission';
import EntityValidation from './entity-validation';
import { useWizard } from '@/contexts/wizard-context';
import ResultsWithSessionId from './results-with-session-id';
import { SCREENING_TYPE_META } from '@/types';

const steps = [
  {
    step: 1,
    title: 'Upload Entities',
    description: 'Import your Entity list to get started',
    content: <FileUpload />,
  },
  {
    step: 2,
    title: 'Review Submission',
    description: 'Confirm and finalize the uploaded list',
    content: <ReviewSubmission />,
  },
  {
    step: 3,
    title: 'Entity Name Validation',
    description: 'Accept/Reject Suggestions',
    content: <EntityValidation />,
  },
  {
    step: 4,
    title: 'Review Results',
    description: 'View detailed results and download reports',
    content: <ResultsWithSessionId />,
  },
];

export default function Steps() {
  const { setActiveStep, activeStep, screeningType } = useWizard();
  const meta = screeningType ? SCREENING_TYPE_META[screeningType] : null;

  return (
    <div className='space-y-4'>
      {meta && (
        <div className='flex justify-end'>
          <Badge variant='outline' className='gap-1.5'>
            {meta.shortLabel}
          </Badge>
        </div>
      )}
      <Stepper value={activeStep} onValueChange={setActiveStep}>
        {steps.map(({ step, title, description }) => (
          <StepperItem
            key={step}
            step={step}
            className='relative flex-1 flex-col!'
          >
            <StepperTrigger
              className='flex-col gap-3 rounded'
              onClick={() => {}}
            >
              <StepperIndicator />
              <div className='space-y-0.5 px-2'>
                <StepperTitle>{title}</StepperTitle>
                <StepperDescription className='max-sm:hidden'>
                  {description}
                </StepperDescription>
              </div>
            </StepperTrigger>
            {step < steps.length && (
              <StepperSeparator className='absolute inset-x-0 top-3 left-[calc(50%+0.75rem+0.125rem)] -order-1 m-0 -translate-y-1/2 group-data-[orientation=horizontal]/stepper:w-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=horizontal]/stepper:flex-none' />
            )}
          </StepperItem>
        ))}
      </Stepper>

      <div className='mt-8'>
        {steps.find((s) => s.step === activeStep)?.content}
      </div>
    </div>
  );
}
