'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  ArrowUpDown,
  DownloadIcon,
  FileSignature,
  FileTextIcon,
  Info,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode, useState, useMemo } from 'react';
import { FeedItem } from '@/types';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDownloadReport } from '@/hooks/use-api';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(date: string): string {
  return new Date(date)
    .toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase();
}

function getTypeIndicator(type: string) {
  return type.toLowerCase() === 'alert' ? 'bg-red-500' : 'bg-purple-400';
}

function getTypeIcon(type: string): ReactNode {
  const lowerCaseType = type.toLowerCase();
  if (lowerCaseType === 'alert') {
    return <AlertTriangle className="h-3 w-3 text-white" />;
  }
  if (lowerCaseType === 'rating_change') {
    return <ArrowUpDown className="h-3 w-3 text-white" />;
  }
  return <RefreshCw className="h-3 w-3 text-white" />;
}

type FeedTimelineProps = {
  data: FeedItem[];
  title?: string;
  showSupplier?: boolean;
};

export default function FeedTimeline({
  data,
  title = 'Alerts & Updates',
  showSupplier = false,
}: Readonly<FeedTimelineProps>) {
  const { mutate: downloadReport } = useDownloadReport();
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Group by ensId + notificationSessionId
  const grouped = useMemo(() => {
    const map = new Map<string, {
      key: string;
      ensId: string;
      notificationSessionId: string;
      supplierName?: string;
      items: FeedItem[];
      latest: FeedItem;
    }>();
    for (const item of data) {
      const key = `${item.ensId}::${item.notificationSessionId}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          ensId: item.ensId,
          notificationSessionId: item.notificationSessionId,
          supplierName: item.supplierName,
          items: [item],
          latest: item,
        });
      } else {
        const g = map.get(key)!;
        g.items.push(item);
        // choose latest (by timestamp) as representative for timeline dot/date
        if (new Date(item.timestamp) > new Date(g.latest.timestamp)) {
          g.latest = item;
        }
      }
    }
    // sort by latest timestamp desc
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latest.timestamp).getTime() - new Date(a.latest.timestamp).getTime()
    );
  }, [data]);

  const cardCount = data.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5" />
          {title} {cardCount > 0 && <span className="text-xs ml-2 bg-muted px-2 py-1 rounded-full">{cardCount} items</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <Info className="mx-auto h-10 w-10 mb-4 opacity-70" />
            <h3 className="text-lg font-medium">No Feed Updates Available</h3>
            <p className="text-sm mt-1">
              There are currently no alerts or updates to display.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-24 top-0 bottom-0 w-0.5 bg-border" />

            {grouped.map(group => {
              const rep = group.latest; // representative notification
              return (
                <div
                  key={group.key}
                  className={cn(
                    'relative flex items-start pb-4 last:mb-0 mb-8'
                  )}
                >
                  {/* Date (from latest item in group) */}
                  <div className="w-20 flex-shrink-0 text-right pr-4">
                    <div className="text-sm font-medium text-foreground">
                      {formatDate(rep.timestamp)}
                    </div>
                    {/* <div className="text-xs text-muted-foreground">
                      {formatTime(rep.timestamp)}
                    </div> */}
                  </div>

                  {/* Timeline Dot */}
                  <div className="relative flex-shrink-0 mx-4">
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full border-2 border-background relative z-5 -translate-x-3',
                        getTypeIndicator(rep.type)
                      )}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        {getTypeIcon(rep.type)}
                      </div>
                    </div>
                  </div>

                  {/* Group Card */}
                  <div className="flex-1 min-w-0">
                    <div className="bg-card border rounded-lg p-4 space-y-3 relative">
                      {/* Supplier Name at bottom right */}
                      {showSupplier && group.supplierName && (
                        <div className="flex absolute top-[-1rem]">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <DownloadIcon className="h-4 w-4" />
                                {group.supplierName}
                                {group.items.length > 1 && (
                                  <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                                    {group.items.length}
                                  </span>
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() =>
                                downloadReport({
                                  sessionId: group.notificationSessionId,
                                  fileName: group.supplierName!,
                                  ensId: group.ensId,
                                  fileType: 'docx',
                                  isBulk: false,
                                })
                              }>
                                <FileTextIcon className="h-4 w-4" />
                                DOCX Report
                              </DropdownMenuItem>
                              {/* Optional extra formats */}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}

                      {/* Inner notifications (seamless) */}
                      {group.items
                        .sort(
                          (a, b) =>
                            new Date(b.timestamp).getTime() -
                            new Date(a.timestamp).getTime()
                        )
                        .map((item, idx) => (
                          <div
                            key={item.id}
                            className={cn(
                              'space-y-2',
                              showSupplier && idx === 0 && 'mt-4',
                              idx > 0 && 'pt-3 border-t'
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <h3 className="text-sm font-semibold text-foreground">
                                {item.title}
                              </h3>
                              <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {formatDate(item.timestamp)} {formatTime(item.timestamp)}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {item.content &&
                                item.content.length > 300 &&
                                !expandedItems[item.id]
                                ? `${item.content.substring(0, 300)}...`
                                : item.content}
                            </p>
                            {item.content && item.content.length > 300 && (
                              <Button
                                variant="link"
                                className="p-0 h-auto text-xs"
                                onClick={() => toggleExpanded(item.id)}
                              >
                                {expandedItems[item.id] ? 'Read less' : 'Read more'}
                              </Button>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}