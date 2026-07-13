'use client';

import { ReactNode } from 'react';
import { BellIcon, RefreshCw, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useRouter } from 'next/navigation';
import { useFeedData } from '@/hooks/use-api';

function NotificationIcon({ type }: { type: string }): ReactNode {
  const lowerCaseType = type.toLowerCase();
  if (lowerCaseType === 'alert') {
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  }
  if (lowerCaseType === 'rating_change') {
    return <ArrowUpDown className="h-4 w-4 text-purple-400" />;
  }
  return <RefreshCw className="h-4 w-4 text-purple-400" />;
}

export default function NotificationMenu() {
  const router = useRouter();

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const startDate = twoWeeksAgo.toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];

  const { data, isLoading } = useFeedData({ startDate, endDate });

  const notifications = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground relative size-8 rounded-full shadow-none"
          aria-label="Open notifications"
        >
          <BellIcon size={16} aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-1" align="end">
        <div className="flex items-baseline justify-between gap-4 px-3 py-2">
          <div className="text-sm font-semibold">Notifications</div>
          <button
            className="text-sm font-semibold hover:underline"
          // onClick={handleMarkAllAsRead}
          >
            Last 2 weeks
          </button>
        </div>
        <div
          role="separator"
          aria-orientation="horizontal"
          className="bg-border -mx-1 my-1 h-px"
        />
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-md px-2  py-2 my-1 text-sm transition-colors`}
              >
                <div className="relative flex items-start pe-3">
                  <div className="mr-2 mt-0.5">
                    <NotificationIcon type={notification.type} />
                  </div>
                  <div className="flex-1 space-y-1 w-96">
                    <button
                      className="text-left after:absolute after:inset-0"
                    // onClick={() => handleNotificationClick(notification.ensId)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="pr-2 font-medium text-sm">
                          {notification.title}
                        </div>
                        {/* <ThemeBadge theme={notification.category} /> */}
                      </div>
                      <p className="text-foreground/80 text-xs line-clamp-2">
                        {notification.content}
                      </p>
                    </button>
                    <div className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(notification.timestamp), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications in the last 2 weeks.
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 my-2">
          <Button
            className="h-7 px-2 w-full"
            variant={'outline'}
            onClick={() => router.push('/continuous-monitoring/feed')}
          >
            View All
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}