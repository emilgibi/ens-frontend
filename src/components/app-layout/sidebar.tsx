'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Settings,
  HelpCircle,
  Menu,
  ChevronLeft,
  ChevronDown,
  ScanSearch,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NavigationItem } from '@/types';
import { navigationItems } from '@/config/navigation';

const bottomNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/help', icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (itemName: string) => {
    setOpenItems((prev) =>
      prev.includes(itemName)
        ? prev.filter((name) => name !== itemName)
        : [...prev, itemName],
    );
  };

  const isItemOpen = (itemName: string) => openItems.includes(itemName);

  const isActiveItem = (item: NavigationItem) => {
    if (pathname === item.href) return true;
    return item.subitems?.some((subitem) => pathname === subitem.href) || false;
  };

  const NavItem = ({ item }: { item: NavigationItem }) => {
    const hasSubitems = item.subitems && item.subitems.length > 0;
    const isActive = isActiveItem(item);
    const isOpen = isItemOpen(item.name);
    const hasBadge = !!(item as any).badge;

    if (!hasSubitems) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              className={cn(
                'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
                isCollapsed && 'justify-center px-2',
              )}
            >
              <item.icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
              {!isCollapsed && (
                <span className="flex-1">{item.name}</span>
              )}
              {!isCollapsed && hasBadge && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #FFE600 0%, #f59e0b 100%)',
                    color: '#1a1a1a',
                    padding: '1px 6px',
                    borderRadius: '8px',
                    letterSpacing: '0.04em',
                    lineHeight: 1.6,
                    flexShrink: 0,
                  }}
                >
                  {(item as any).badge}
                </span>
              )}
            </Link>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side='right' className='flex items-center gap-4'>
              {item.name}
              {hasBadge && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    background: '#FFE600',
                    color: '#1a1a1a',
                    padding: '1px 6px',
                    borderRadius: '8px',
                  }}
                >
                  {(item as any).badge}
                </span>
              )}
            </TooltipContent>
          )}
        </Tooltip>
      );
    }

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              className={cn(
                'flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
              )}
            >
              <item.icon className='h-4 w-4' />
            </Link>
          </TooltipTrigger>
          <TooltipContent side='right' className='flex flex-col gap-1 p-2'>
            <div className='font-medium'>{item.name}</div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleItem(item.name)}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors text-left',
              isActive
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
            )}
          >
            <item.icon className='h-4 w-4 mr-3' />
            <span className='flex-1'>{item.name}</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isOpen && 'rotate-180',
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className='space-y-1'>
          <div className='ml-4 border-l border-border pl-4 space-y-1'>
            {item.subitems?.map((subitem) => (
              <Link
                key={subitem.name}
                href={subitem.href}
                className={cn(
                  'flex items-center rounded-md px-3 py-1 text-sm transition-colors',
                  pathname === subitem.href
                    ? 'bg-secondary text-secondary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
                )}
              >
                {subitem.icon && <subitem.icon className='h-3 w-3 mr-3' />}
                <span>{subitem.name}</span>
              </Link>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const BottomNavItem = ({
    item,
  }: {
    item: (typeof bottomNavigation)[number];
  }) => (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          className={cn(
            'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
            pathname === item.href
              ? 'bg-secondary text-secondary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
            isCollapsed && 'justify-center px-2',
          )}
        >
          <item.icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
          {!isCollapsed && <span>{item.name}</span>}
        </Link>
      </TooltipTrigger>
      {isCollapsed && (
        <TooltipContent side='right' className='flex items-center gap-4'>
          {item.name}
        </TooltipContent>
      )}
    </Tooltip>
  );

  return (
    <TooltipProvider>
      <>
        <button
          className='lg:hidden fixed top-4 left-4 z-50 p-2 bg-background rounded-md shadow-md'
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label='Toggle sidebar'
        >
          <Menu className='h-6 w-6' />
        </button>

        <div
          className={cn(
            'fixed overflow-hidden inset-y-0 z-20 flex flex-col bg-background lg:static h-screen transition-transform',
            isCollapsed ? 'w-[68px]' : 'w-68',
            isMobileOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0',
          )}
        >
          <div className='z-10 border-b border-border'>
            <div
              className={cn(
                'flex h-16 items-center gap-2 pl-4',
                isCollapsed && 'justify-center px-2',
              )}
            >
              <Link
                href='#'
                className={cn(
                  'flex items-center font-semibold',
                  isCollapsed && 'w-0 opacity-0 overflow-hidden',
                )}
              >
                <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground mr-2'>
                  <ScanSearch className='size-4' />
                </div>
                <div className='flex flex-col gap-0.5 leading-none'>
                  <span className='font-semibold'>RiskLens</span>
                  <span className='text-xs font-semibold text-muted-foreground'>
                    Risk Management
                  </span>
                </div>
              </Link>
              <Button
                variant='ghost'
                size='sm'
                className={cn('ml-auto h-8 w-8', isCollapsed && 'ml-0')}
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                <ChevronLeft
                  className={cn(
                    'h-4 w-4 transition-transform',
                    isCollapsed && 'rotate-180',
                  )}
                />
                <span className='sr-only'>
                  {isCollapsed ? 'Expand' : 'Collapse'} Sidebar
                </span>
              </Button>
            </div>
          </div>

          <div className='flex-1 bg-sidebar-accent overflow-y-auto'>
            <nav className='flex-1 space-y-1 px-2 py-4'>
              {navigationItems.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </nav>
          </div>
        </div>
      </>
    </TooltipProvider>
  );
}
