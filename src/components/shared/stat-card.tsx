'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import NumberTicker from './number-ticker';

type StatCardProps = {
  title: string;
  value: number;
  icon?: ReactNode;
  description?: string;
  className?: string;
};

export const StatCard = ({
  title,
  value,
  icon,
  description,
  className,
}: StatCardProps) => {
  return (
    <Card className={cn('w-full shadow-md', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-md font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>

      <CardContent className="h-full  flex flex-col justify-center items-start">
        <NumberTicker
          value={value}
          className="whitespace-pre-wrap text-3xl font-medium tracking-tighter text-black dark:text-white"
        />
        {description && (
          <p className="text-sm pt-2 text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};
