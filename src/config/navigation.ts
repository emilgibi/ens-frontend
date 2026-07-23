import { NavigationItem } from '@/types';
import {
  History,
  LayoutDashboard,
  SearchCheck,
  MapPin,
  ShieldAlert,
  ClipboardList,
  UserCheck,
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
  {
    name: 'Continuous Monitoring',
    href: '/continuous-monitoring',
    icon: ShieldAlert,
    subitems: [
      { name: 'Overview', href: '/continuous-monitoring' },
      { name: 'Watchlist', href: '/continuous-monitoring/watchlist' },
      { name: 'Alert Feed', href: '/continuous-monitoring/feed' },
      { name: 'Configuration', href: '/continuous-monitoring/configuration' },
    ],
  },
  {
    name: 'Vendor Survey',
    href: '/vendor-survey',
    icon: ClipboardList,
  },
  {
    name: 'Vendor Onboarding',
    href: '/vendor-onboarding',
    icon: UserCheck,
  },
];
