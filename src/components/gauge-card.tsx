import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const gaugeVariants = cva(
  'text-2xl font-bold',
  {
    variants: {
      color: {
        default: 'text-foreground',
        success: 'text-[hsl(var(--success))]',
        warning: 'text-[hsl(var(--warning))]',
        danger: 'text-destructive',
      },
    },
    defaultVariants: {
      color: 'default',
    },
  },
)

const gaugeMeterVariants = cva(
  'transition-all duration-500 ease-in-out',
  {
    variants: {
      color: {
        default: 'stroke-primary',
        success: 'stroke-[hsl(var(--success))]',
        warning: 'stroke-[hsl(var(--warning))]',
        danger: 'stroke-destructive',
      },
    },
    defaultVariants: {
      color: 'default',
    },
  },
)

interface GaugeCardProps extends VariantProps<typeof gaugeVariants> {
  title: string
  value: number
  max?: number
  description?: string
  className?: string
  formatValue?: (value: number) => string
}

export function GaugeCard({
  title,
  value,
  max = 100,
  description,
  color,
  className,
  formatValue = value => value.toString(),
}: GaugeCardProps) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100))
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (percentage / 100) * (circumference / 2)

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-0">
        <div className="relative h-28 w-full">
          <svg viewBox="0 0 100 58" className="w-full h-full">
            <path
              d="M 5 50 A 45 45 0 0 1 95 50"
              fill="none"
              strokeWidth="10"
              className="stroke-muted"
            />
            <path
              d="M 5 50 A 45 45 0 0 1 95 50"
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              className={cn(gaugeMeterVariants({ color }))}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
              }}
            />
          </svg>
          <div className="absolute bottom-0 w-full text-center">
            <span className={cn(gaugeVariants({ color }))}>
              {formatValue(value)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
