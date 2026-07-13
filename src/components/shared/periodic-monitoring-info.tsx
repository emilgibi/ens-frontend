import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function PeriodicMonitoringInfo() {
  const getLocalTimeString = () => {
    const utcTime = new Date();
    utcTime.setUTCHours(21, 30, 0, 0); // 9:30 PM UTC
    
    const localTime = utcTime.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }).toUpperCase();
    
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const shortTimeZone = timeZone.split('/').pop()?.replace('_', ' ') || timeZone;
    
    return `${localTime} ${shortTimeZone}`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 ml-1.5 cursor-pointer" />
        </TooltipTrigger>
        <TooltipContent>
          <p>
            Periodic monitoring groups run at {getLocalTimeString()} (9:30 PM UTC) on their
            scheduled dates
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}