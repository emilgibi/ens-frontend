import { NavigationItem } from '@/types';
import {
  History,
  LayoutDashboard,
  SearchCheck,
  MapPin,
} from 'lucide-react';

export const navigationItems: NavigationItem[] = [
  {
    name: 'Vendor Intelligence',
    href: '/entity-universe',
    icon: LayoutDashboard,
  },
  {
    name: 'Run Screening',
    href: '/run-screening',
    icon: SearchCheck,
  },
  {
    name: 'Screening History',
    href: '/screening-history',
    icon: History,
  },
  {
    name: 'Location360',
    href: '/location360',
    icon: MapPin,
  },
];