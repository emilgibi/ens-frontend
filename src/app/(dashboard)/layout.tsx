// components/app-layout/DashboardLayout.tsx
import { Sidebar } from '@/components/app-layout/sidebar';
import { TopNav } from '@/components/app-layout/top-nav';
import { SettingsProvider } from '@/contexts/settings-context';
import React from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='min-h-screen flex h-screen'>
      <SettingsProvider>
        <Sidebar />
        <div className='flex-1 overflow-y-auto'>
          <TopNav />
          <div className='container mx-auto p-6 md:max-w-6xl 2xl:max-w-7xl'>
            <main className='w-full'>{children}</main>
          </div>
        </div>
      </SettingsProvider>
    </div>
  );
}
