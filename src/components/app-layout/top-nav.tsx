import React from 'react';
import NotificationMenu from '@/components/app-layout/notification-menu';
import UserMenu from '@/components/app-layout/user-menu';
import ThemeToggle from '../shared/theme-toggle';
import DynamicBreadcrumb from '../shared/breadcrumb';

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex h-16 items-center justify-between pl-4 md:px-6 md:max-w-6xl 2xl:max-w-7xl mx-auto">
        <div className="hidden md:block">
          <DynamicBreadcrumb />
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <NotificationMenu />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
