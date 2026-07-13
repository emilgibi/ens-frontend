'use client';

import { Building2, Globe2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ScreeningType, SCREENING_TYPE_META } from '@/types';

interface ScreeningTypeDialogProps {
  open: boolean;
  onSelect: (type: ScreeningType) => void;
}

const OPTIONS: {
  type: ScreeningType;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    type: 'domestic',
    icon: <Building2 className='size-6' aria-hidden='true' />,
    description:
      'Screen Indian / domestic vendors using the Probe42 pipeline (PAN, CIN, GSTIN based matching).',
  },
  {
    type: 'international',
    icon: <Globe2 className='size-6' aria-hidden='true' />,
    description:
      "Screen overseas / international vendors using the Moody's pipeline (LEI, DUNS based matching).",
  },
];

export default function ScreeningTypeDialog({
  open,
  onSelect,
}: ScreeningTypeDialogProps) {
  return (
    <Dialog open={open}>
      {/* No onOpenChange / close affordance on purpose — the choice is
          mandatory before the wizard can render. */}
      <DialogContent
        showCloseButton={false}
        className='sm:max-w-lg bg-[#111114] border border-white/15 text-white shadow-2xl shadow-black/60'
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className='text-white'>Select Screening Type</DialogTitle>
          <DialogDescription className='text-white/60'>
            Choose whether you want to screen domestic or international
            vendors. This determines which pipeline (Probe42 or Moody&apos;s)
            is used for this screening run.
          </DialogDescription>
        </DialogHeader>

        <div className='grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2'>
          {OPTIONS.map(({ type, icon, description }) => {
            const meta = SCREENING_TYPE_META[type];
            return (
              <button
                key={type}
                type='button'
                onClick={() => onSelect(type)}
                className={cn(
                  'group flex flex-col items-start gap-2 rounded-xl border-2 border-dashed border-white/25 p-4 text-left text-white transition-colors',
                  'hover:border-white hover:bg-white/10 focus-visible:border-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none',
                )}
              >
                <div className='flex size-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10'>
                  {icon}
                </div>
                <div className='space-y-0.5'>
                  <p className='text-sm font-medium text-white'>{meta.label}</p>
                  <p className='text-white/60 text-xs'>
                    Pipeline: {meta.provider}
                  </p>
                </div>
                <p className='text-white/60 text-xs'>{description}</p>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
