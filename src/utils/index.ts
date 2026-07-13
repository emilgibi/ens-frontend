import { navigationItems } from '@/config/navigation';
import { NavigationItem } from '@/types';

export function getNavigationItemByPath(
  pathname: string,
): NavigationItem | undefined {
  for (const item of navigationItems) {
    if (pathname.includes('periodic-monitoring')) {
      return navigationItems.find((item) =>
        item.href.includes('periodic-monitoring'),
      );
    }

    if (item.href === pathname) {
      return item;
    }

    if (item.subitems) {
      const subitem = item.subitems.find((sub) => sub.href === pathname);
      if (subitem) {
        return item;
      }
    }
  }

  return undefined;
}

export function calculateNextScreeningDate(
  lastDate: string | null,
  interval: string,
  frequency: number,
): Date | null {
  if (!lastDate || !interval || frequency === null) return null;

  const nextDate = new Date(lastDate);
  const intervalUpper = interval.toUpperCase();

  switch (intervalUpper) {
    case 'HOUR':
      nextDate.setHours(nextDate.getHours() + frequency);
      break;
    case 'DAY':
      nextDate.setDate(nextDate.getDate() + frequency);
      break;
    case 'WEEK':
      nextDate.setDate(nextDate.getDate() + frequency * 7);
      break;
    case 'MONTH':
      nextDate.setMonth(nextDate.getMonth() + frequency);
      break;
    case 'QUARTER':
      nextDate.setMonth(nextDate.getMonth() + frequency * 3);
      break;
    case 'YEAR':
      nextDate.setFullYear(nextDate.getFullYear() + frequency);
      break;
    default:
      return null;
  }
  return nextDate;
}
