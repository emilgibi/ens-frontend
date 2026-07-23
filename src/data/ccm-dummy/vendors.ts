import { Vendor } from '@/types/ccm';

export const vendors: Vendor[] = [
  {
    id: 'v-skylift',
    name: 'SkyLift Aviation Logistics',
    industry: 'Airline / Logistics',
    country: 'India',
    currentTier: 'CRITICAL',
    trend: 'up',
    lastEventDate: '2026-05-14',
    scenario:
      'Mirrors a Go First-style collapse — grounded aircraft, lessor disputes, and an insolvency filing over four quarters.',
  },
  {
    id: 'v-cliniva',
    name: 'Cliniva Pharma Intermediates',
    industry: 'Pharmaceutical API Supplier',
    country: 'India',
    currentTier: 'HIGH',
    trend: 'up',
    lastEventDate: '2026-06-02',
    scenario:
      'A regulatory compliance breach (failed plant inspection) is compounding with adverse media, not yet critical.',
  },
  {
    id: 'v-vantage',
    name: 'Vantage Components Manufacturing',
    industry: 'Auto Components Manufacturing',
    country: 'India',
    currentTier: 'MODERATE',
    trend: 'up',
    lastEventDate: '2026-06-20',
    scenario:
      'Early financial stress signals — delayed payments to sub-suppliers, minor credit downgrade — nothing critical yet.',
  },
  {
    id: 'v-northbridge',
    name: 'Northbridge Packaging Solutions',
    industry: 'Packaging / FMCG Supplier',
    country: 'India',
    currentTier: 'LOW',
    trend: 'flat',
    lastEventDate: '2026-04-10',
    scenario: 'Stable vendor, included for contrast — clean screening history, no material findings.',
  },
];
