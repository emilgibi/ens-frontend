import React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Rating } from '@/types';

const gaugeVariants = cva('transition-all duration-500 ease-in-out', {
  variants: {
    rating: {
      high: 'stroke-red-500',
      medium: 'stroke-yellow-500',
      low: 'stroke-green-500',
    },
  },
  defaultVariants: {
    rating: 'medium',
  },
});

const textVariants = cva('text-xl font-bold', {
  variants: {
    rating: {
      high: 'text-red-500',
      medium: 'text-yellow-500',
      low: 'text-green-500',
    },
  },
  defaultVariants: {
    rating: 'medium',
  },
});

export interface GaugeCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gaugeVariants> {
  rating: Rating;
}

export function GaugeCard({
  rating,
  className,
  ...props
}: Readonly<GaugeCardProps>) {
  const max = 100;

  const normalizedRating = rating?.toLowerCase() as Rating;

  const value =
    normalizedRating === 'high' ? 85 : normalizedRating === 'low' ? 25 : 50;

  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset =
    circumference - (percentage / 100) * (circumference / 2);

  return (
    <Card className={cn('gap-2', className)} {...props}>
      <CardHeader className='pb-2'>
        <CardTitle className='text-md font-medium'>Risk Level</CardTitle>
        <CardDescription>
          This score is based on various risk indicators and assessments.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col items-center justify-center pt-0'>
        <div className='relative h-18 w-full'>
          <svg viewBox='0 0 100 58' className='w-full h-full'>
            <path
              d='M 5 50 A 45 45 0 0 1 95 50'
              fill='none'
              strokeWidth='10'
              className='stroke-muted'
            />
            <path
              d='M 5 50 A 45 45 0 0 1 95 50'
              fill='none'
              strokeWidth='10'
              strokeLinecap='round'
              className={cn(gaugeVariants({ rating: normalizedRating }))}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
              }}
            />
          </svg>
          <div className='absolute bottom-0 w-full text-center'>
            <span className={cn(textVariants({ rating: normalizedRating }))}>
              {normalizedRating?.charAt(0).toUpperCase() +
                normalizedRating?.slice(1) || 'Medium'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
