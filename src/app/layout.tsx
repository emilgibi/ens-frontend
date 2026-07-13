import { Toaster } from '@/components/ui/sonner';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { ThemeProvider } from '@/components/shared/theme-provider';

import { ReactQueryProvider } from '@/contexts/react-query';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Entity Screening',
  description: 'A comprehensive entity screening tool',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={`${inter.className}`}>
        <NuqsAdapter>
          <ThemeProvider attribute={'class'} defaultTheme='system' enableSystem>
            <ReactQueryProvider>
              <main>{children}</main>
              <Toaster closeButton={true} position='top-right' />
            </ReactQueryProvider>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
