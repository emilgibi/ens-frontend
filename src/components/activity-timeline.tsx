import { ArrowRight, MessageSquare, UploadCloud, UserPlus } from 'lucide-react'
import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ActivityTimelineProps {
  children: React.ReactNode
  className?: string
}

export function ActivityTimeline({ children, className }: ActivityTimelineProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {children}
    </div>
  )
}

interface ActivityTimelineItemProps {
  timestamp: string
  children: React.ReactNode
  isLast?: boolean
  className?: string
  icon?: React.ReactNode
}

export function ActivityTimelineItem({
  timestamp,
  children,
  isLast = false,
  className,
  icon,
}: ActivityTimelineItemProps) {
  return (
    <div className={cn('flex', className)}>
      <div className="flex flex-col items-center w-20 text-right mr-4">
        <span className="text-sm text-muted-foreground">{timestamp}</span>
      </div>
      <div className="relative flex-shrink-0">
        <div className="h-full w-0.5 bg-muted"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-muted border-2 border-background flex items-center justify-center">
          {icon}
        </div>
        {isLast && <div className="absolute bottom-0 left-0 w-full h-1/2 bg-background"></div>}
      </div>
      <div className="flex-1 pb-8 pl-4">
        {children}
      </div>
    </div>
  )
}

interface ActivityCardProps {
  activityIcon?: React.ReactNode
  title: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function ActivityCard({
  activityIcon,
  title,
  children,
  className,
}: ActivityCardProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {activityIcon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
              {activityIcon}
            </div>
          )}
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">{title}</div>
            {children && <div className="mt-2">{children}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ActivityTimelineExample() {
  return (
    <div className="p-4 max-w-xl mx-auto">
      <ActivityTimeline>
        <ActivityTimelineItem
          timestamp="15:32"
          icon={<span className="w-2.5 h-2.5 rounded-full bg-gray-400" />}
        >
          <ActivityCard
            activityIcon={<MessageSquare className="h-4 w-4" />}
            title={(
              <>
                <span className="font-semibold text-foreground">Mickael Bjorn</span>
                {' '}
                left a comment on
                {' '}
                <span className="font-semibold text-foreground">Chron SEO Campaign</span>
              </>
            )}
          >
            <Badge variant="outline" className="font-normal">
              <span className="w-2 h-2 rounded-full bg-cyan-500 mr-2"></span>
              www.ey.io SEO Campaign
            </Badge>
          </ActivityCard>
        </ActivityTimelineItem>

        <ActivityTimelineItem
          timestamp="21:32"
          icon={<span className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
        >
          <ActivityCard
            activityIcon={<UserPlus className="h-4 w-4" />}
            title={(
              <>
                <span className="font-semibold text-foreground">Mark Hewitt</span>
                {' '}
                invited you to edit a new campaign he created
              </>
            )}
          >
            <Badge variant="outline" className="font-normal">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              www.eymotif.com Keyword Research
            </Badge>
          </ActivityCard>
        </ActivityTimelineItem>

        <ActivityTimelineItem
          timestamp="23:41"
          icon={<span className="w-2.5 h-2.5 rounded-full bg-green-500" />}
        >
          <ActivityCard
            activityIcon={<UploadCloud className="h-4 w-4" />}
            title={(
              <>
                <span className="font-semibold text-foreground">Jerome Bell</span>
                {' '}
                uploaded a file in
                {' '}
                <span className="font-semibold text-foreground">Chron SEO Campaign</span>
              </>
            )}
          >
            <Badge variant="outline" className="font-normal">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              www.eygds.com Keyword Research
            </Badge>
          </ActivityCard>
        </ActivityTimelineItem>

        <ActivityTimelineItem
          timestamp="1d"
          isLast={true}
          icon={<span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500" />}
        >
          <ActivityCard
            activityIcon={<ArrowRight className="h-4 w-4" />}
            title={(
              <>
                <span className="font-semibold text-foreground">Kathryn Murphy</span>
                {' '}
                has added 43 new keywords in
                {' '}
                <span className="font-semibold text-foreground">Sephora KW Res</span>
              </>
            )}
          >
            <Badge variant="outline" className="font-normal">
              <span className="w-2 h-2 rounded-full bg-fuchsia-500 mr-2"></span>
              Sephora KW Research
            </Badge>
          </ActivityCard>
        </ActivityTimelineItem>
      </ActivityTimeline>
    </div>
  )
}
