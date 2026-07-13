'use client';

import { Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import { cn } from '@/lib/utils';
import { SupplierFindings } from '@/types';

import { useEntityFindings } from '@/hooks/use-api';
import { ToastMessage } from '../shared/toast-message';
import FindingsMultiAccordion from './findings-accordion';
import { RiskBadge, RiskLevel } from './risk-badge';

// Types
interface Section {
  title: string;
  id: keyof SupplierFindings['ratings'];
}

interface FindingCardProps {
  id: string;
  title: string;
  risk: RiskLevel;
  onClick: () => void;
  isActive: boolean;
}


const SECTIONS: Section[] = [
  { title: 'Entity Existence', id: 'entity_existence' },
  { title: 'Legal', id: 'legal' },
  { title: 'Financial', id: 'financials' },
  { title: 'Adverse Media', id: 'adverse_media' },
  { title: 'Additional Indicators', id: 'cyber_esg' },
];

// Utility functions
const getRiskColorClasses = (risk: RiskLevel, isSelected: boolean): string => {
  const colorMap = {
    high: {
      selected: 'border-red-300 dark:bg-red-950/20 dark:border-red-400',
      hover: 'hover:bg-red-50/50 dark:hover:bg-red-950/10',
    },
    medium: {
      selected:
        'border-orange-300 dark:bg-orange-950/20 dark:border-orange-400',
      hover: 'hover:bg-orange-50/50 dark:hover:bg-orange-950/10',
    },
    low: {
      selected: 'border-green-300 dark:bg-green-950/20 dark:border-green-400',
      hover: 'hover:bg-green-50/50 dark:hover:bg-green-950/10',
    },
    none: {
      selected: 'border-gray-500 dark:bg-gray-150/20 dark:border-gray-400',
      hover: 'hover:bg-gray-50/50 dark:hover:bg-gray-950/10',
    },
    'no alerts': {
      selected: 'border-gray-500 dark:bg-gray-150/20 dark:border-gray-400',
      hover: 'hover:bg-gray-50/50 dark:hover:bg-gray-950/10',
    },
  };

  const colors =
    colorMap[risk.toLowerCase() as keyof typeof colorMap] || colorMap.none;
  return isSelected ? colors.selected : colors.hover;
};

// Components
const FindingCard: React.FC<FindingCardProps> = ({
  onClick,
  isActive,
  id,
  title,
  risk,
}) => (
  <Card
    className={cn(
      'h-[50px] 2xl:h-[80px] border-2 p-4 cursor-pointer group transition-colors duration-200',
      getRiskColorClasses(risk, isActive),
      isActive && 'shadow-sm',
    )}
    onClick={onClick}
  >
    <div className='flex items-center justify-between gap-4 h-full'>
      <div className='flex items-start gap-3 flex-1 min-w-0'>
        <div className='space-y-1 flex-1 min-w-0'>
          <Label
            htmlFor={id}
            title={title}
            className='text-sm font-medium leading-snug cursor-pointer block truncate 2xl:whitespace-normal 2xl:overflow-visible 2xl:text-clip'
          >
            {title}
          </Label>
        </div>
      </div>
      <RiskBadge risk={risk} size='small' />
    </div>
  </Card>
);

const LoadingState: React.FC = () => (
  <div className='flex items-center justify-center gap-2 h-full'>
    <Loader2 className='animate-spin h-6 w-6' />
    <span className='ml-1 text-md font-normal'>Getting details...</span>
  </div>
);

const NoFindingsCard: React.FC = () => (
  <Card className='py-2 rounded-sm bg-sidebar-accent dark:bg-gray-800'>
    <CardContent className='text-center'>No True Hits Identified</CardContent>
  </Card>
);

const FindingsSection: React.FC<{
  section: Section;
  data: SupplierFindings;
}> = ({ section, data }) => {
  const rating = data.ratings[section.id];
  // @ts-ignore
  const findings = data.findings[section.id];

  if (!rating) return null;

  return (
    <section id={section.id} className='scroll-mt-4'>
      <Card className='mb-4'>
        <CardHeader>
          <CardTitle className='flex items-center justify-between gap-4'>
            <h4 className='text-md font-medium'>{section.title}</h4>
            <RiskBadge risk={rating as RiskLevel} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {findings?.length ? (
            <FindingsMultiAccordion findings={findings} />
          ) : (
            <NoFindingsCard />
          )}
        </CardContent>
      </Card>
    </section>
  );
};

const useScrollToSection = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (sectionId: string) => {
    const scrollContainer = scrollContainerRef.current;
    const element = document.getElementById(sectionId);

    if (element && scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const scrollTop = scrollContainer.scrollTop;
      const targetScrollTop =
        scrollTop + elementRect.top - containerRect.top - 20;

      scrollContainer.scrollTo({
        top: targetScrollTop + 16,
        behavior: 'smooth',
      });
    }
  };

  return { scrollContainerRef, scrollToSection };
};

// Main component
export default function EntityFindings({
  ensId,
}: Readonly<{
  ensId: string;
}>) {
  const [activeSection, setActiveSection] = useState('entity');
  const { data, isPending, isError } = useEntityFindings(ensId);

  const { scrollContainerRef, scrollToSection } = useScrollToSection();

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    scrollToSection(sectionId);
  };

  if (isError) {
    toast.custom(() => (
      <ToastMessage
        variant='error'
        title='Failed to fetch data'
        message='Please try again.'
      />
    ));
  }

  if (isPending) {
    return <LoadingState />;
  }

  if (!ensId || !data) {
    return null;
  }

  return (
    <div className='flex h-[600px] my-4'>
      {/* Left Sidebar */}
      <div className='w-84 flex-shrink-0 border-r border-border pr-4'>
        <div className='space-y-2'>
          {SECTIONS.map((section) => {
            const rating = data.ratings[section.id];
            if (!rating) return null;

            return (
              <FindingCard
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                id={section.id}
                title={section.title}
                risk={rating as RiskLevel}
                isActive={activeSection === section.id}
              />
            );
          })}
        </div>
      </div>

      {/* Right Content */}
      <div ref={scrollContainerRef} className='flex-1 overflow-y-auto pl-4'>
        <div className='max-w-4xl mx-auto'>
          {SECTIONS.map((section) => (
            <FindingsSection key={section.id} section={section} data={data} />
          ))}
        </div>
      </div>
    </div>
  );
}
