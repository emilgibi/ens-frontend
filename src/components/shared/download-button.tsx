import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDownloadReport } from '@/hooks/use-api';
import { ScreeningType } from '@/types';
import { DownloadIcon, FileSignature, FileTextIcon } from 'lucide-react';

type DownloadOption = {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  sessionId: string;
  ensId: string;
  fileType: 'docx' | 'pdf';
  fileName: string;
  isBulk?: boolean;
  // Defaults to 'domestic' when omitted — every existing caller (periodic
  // monitoring, entity universe) is Probe42-only and unaffected; only
  // results.tsx needs to pass the real pipeline through.
  screeningType?: ScreeningType;
};

type DownloadDropdownProps = {
  options?: DownloadOption[];
  sessionId?: string;
  ensId?: string;
  fileName?: string;
  variant?: 'ghost' | 'outline';
  showLabel?: boolean;
  screeningType?: ScreeningType;
};

export function DownloadDropdown({
  options,
  sessionId,
  ensId,
  fileName,
  variant = 'ghost',
  showLabel = false,
  screeningType,
}: DownloadDropdownProps) {
  const { mutate: downloadReport } = useDownloadReport();

  const downloadOptions: DownloadOption[] =
    options ||
    (sessionId && ensId && fileName
      ? [
        {
          sessionId,
          ensId,
          fileType: 'docx' as const,
          fileName,
          label: 'DOCX Report',
          icon: <FileTextIcon size={16} />,
        },
        // {
        //   sessionId,
        //   ensId,
        //   fileType: 'pdf' as const,
        //   fileName,
        //   label: 'PDF Report',
        //   icon: <FileSignature size={16} />,
        // },
      ]
      : []);

  return (
    <div
      className={
        showLabel
          ? 'flex items-center'
          : 'flex items-center justify-center w-full'
      }
      onClick={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={showLabel ? 'sm' : 'icon'}
            className={showLabel ? 'gap-2' : 'h-8 w-8'}
            disabled={!downloadOptions.length}
          >
            <DownloadIcon size={16} />
            {showLabel && 'Download'}
            <span className='sr-only'>Download Options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          {downloadOptions.map((option) => (
            <DropdownMenuItem
              key={option.label}
              className='gap-2'
              onClick={() =>
                downloadReport({
                  sessionId: option.sessionId,
                  fileName: option.fileName,
                  ensId: option.ensId,
                  fileType: option.fileType,
                  isBulk: false,
                  screeningType: option.screeningType ?? screeningType,
                })
              }
            >
              {option.icon}
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}