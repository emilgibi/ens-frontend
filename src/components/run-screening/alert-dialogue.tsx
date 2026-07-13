import { CircleAlertIcon } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DialogueAlertProps {
  open: boolean;
  title: string;
  description: string | (() => React.ReactNode);
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export default function DialogueAlert({
  open,
  title,
  description,
  onConfirm,
  onOpenChange,
}: DialogueAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <div className='flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4'>
          <div
            className='flex size-9 shrink-0 items-center justify-center rounded-full border'
            aria-hidden='true'
          >
            <CircleAlertIcon className='opacity-80' size={16} />
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>
              {typeof description === 'function' ? description() : description}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
