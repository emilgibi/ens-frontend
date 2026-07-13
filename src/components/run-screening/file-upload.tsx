'use client';

import { useEffect, useRef } from 'react';

import {
  AlertCircleIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  UploadIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { EXCEL_FILE_MIME_TYPE } from '@/constants';
import { useWizard } from '@/contexts/wizard-context';
import { useExcelFileUpload } from '@/hooks/use-api';
import { useFileUpload } from '@/hooks/use-file-upload';

import { ToastMessage } from '../shared/toast-message';

export default function FileUpload() {
  const { setSessionId, setActiveStep, screeningType } = useWizard();
  const hasUploadedRef = useRef(false);

  const {
    mutate: uploadFile,
    isPending,
    isError,
    data,
    isSuccess,
    error,
  } = useExcelFileUpload(screeningType ?? 'domestic');

  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    accept: EXCEL_FILE_MIME_TYPE,
  });

  // Handle file upload when files change
  useEffect(() => {
    if (files.length > 0 && !hasUploadedRef.current && !isPending) {
      hasUploadedRef.current = true;
      uploadFile(files[0].file as File);
    }
  }, [files, uploadFile, isPending]);

  // Handle successful upload
  useEffect(() => {
    if (isSuccess && data) {
      setSessionId(data.data.session_id);
      setActiveStep(2);
    }
  }, [isSuccess, data, setSessionId, setActiveStep]);

  useEffect(() => {
    if (isError) {
      const errorMessage = error.message || 'Failed to upload file';
      toast.custom(() => (
        <ToastMessage
          variant={'error'}
          title='Failed to upload file'
          message={errorMessage}
        />
      ));
      hasUploadedRef.current = false;
    }
  }, [isError]);

  return (
    <div className='flex flex-col gap-2'>
      <div className='relative'>
        {/* Drop area */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          data-dragging={isDragging || undefined}
          className='border-input data-[dragging=true]:bg-accent/50 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-4 transition-colors has-[input:focus]:ring-[3px]'
        >
          <input
            {...getInputProps()}
            className='sr-only'
            aria-label='Upload image file'
            disabled={isPending}
          />
          <div className='flex flex-col items-center justify-center px-4 py-3 text-center'>
            <div
              className='bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border'
              aria-hidden='true'
            >
              <FileSpreadsheetIcon className='size-4 opacity-60' />
            </div>
            <p className='mb-1.5 text-sm font-medium'>Upload Entity List</p>
            <p className='text-muted-foreground text-xs'>
              Drag and drop your Excel file here
            </p>
            <Button
              variant='outline'
              className='mt-4'
              onClick={openFileDialog}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2Icon className='size-4 animate-spin' />
              ) : (
                <UploadIcon
                  className='-ms-1 size-4 opacity-60'
                  aria-hidden='true'
                />
              )}

              {isPending ? 'Validating Uploaded Excel...' : 'Select Excel'}
            </Button>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div
          className='text-destructive flex items-center gap-1 text-xs'
          role='alert'
        >
          <AlertCircleIcon className='size-3 shrink-0' />
          <span>{errors[0]}</span>
        </div>
      )}
    </div>
  );
}
