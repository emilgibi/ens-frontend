'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import { getNavigationItemByPath } from '@/utils';

import { usePathname } from 'next/navigation';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function DynamicBreadcrumb() {
  const pathname = usePathname();
  const currentItem = getNavigationItemByPath(pathname);

  const subitem = currentItem?.subitems?.find((sub) => sub.href === pathname);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {currentItem && (
          <BreadcrumbItem>
            <BreadcrumbLink
              href={`${basePath}${currentItem.href}`}
              className={cn(
                'inline-flex items-center gap-1.5',
                !subitem && 'text-foreground'
              )}
            >
              <currentItem.icon size={16} aria-hidden="true" />
              {currentItem.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
        )}

        {subitem && (
          <>
            <BreadcrumbSeparator> / </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{subitem.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
