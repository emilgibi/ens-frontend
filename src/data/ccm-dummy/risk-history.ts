import { RiskSnapshot } from '@/types/ccm';

export const riskHistory: RiskSnapshot[] = [
  // SkyLift Aviation Logistics - Critical (Go First-style collapse)
  {
    vendorId: 'v-skylift',
    quarter: 'Q3 2025',
    tier: 'LOW',
    signals: ['Routine operations', 'On-time lease payments', 'No adverse media'],
  },
  {
    vendorId: 'v-skylift',
    quarter: 'Q4 2025',
    tier: 'MODERATE',
    signals: ['Increase in grounded aircraft', 'Operational disruptions', 'Initial adverse media alerts'],
  },
  {
    vendorId: 'v-skylift',
    quarter: 'Q1 2026',
    tier: 'HIGH',
    signals: ['Vendor payment delays', 'Lessor disputes', 'Negative financial trends'],
  },
  {
    vendorId: 'v-skylift',
    quarter: 'Q2 2026',
    tier: 'CRITICAL',
    signals: ['Multiple legal proceedings', 'Credit deterioration', 'Insolvency proceeding initiated'],
  },

  // Cliniva Pharma Intermediates - High (regulatory breach)
  {
    vendorId: 'v-cliniva',
    quarter: 'Q3 2025',
    tier: 'LOW',
    signals: ['Clean regulatory record', 'Stable production output'],
  },
  {
    vendorId: 'v-cliniva',
    quarter: 'Q4 2025',
    tier: 'MODERATE',
    signals: ['Minor GMP observations noted', 'Vendor requested clarification window'],
  },
  {
    vendorId: 'v-cliniva',
    quarter: 'Q1 2026',
    tier: 'HIGH',
    signals: ['Failed plant inspection (regulatory)', 'Adverse media on quality lapses', 'Customer audits triggered'],
  },
  {
    vendorId: 'v-cliniva',
    quarter: 'Q2 2026',
    tier: 'HIGH',
    signals: ['Import alert risk flagged', 'Elevated compliance scrutiny ongoing'],
  },

  // Vantage Components Manufacturing - Moderate (financial stress)
  {
    vendorId: 'v-vantage',
    quarter: 'Q3 2025',
    tier: 'LOW',
    signals: ['Healthy order book', 'Timely supplier payments'],
  },
  {
    vendorId: 'v-vantage',
    quarter: 'Q4 2025',
    tier: 'LOW',
    signals: ['Minor working-capital tightening noted'],
  },
  {
    vendorId: 'v-vantage',
    quarter: 'Q1 2026',
    tier: 'MODERATE',
    signals: ['Delayed payments to sub-suppliers', 'Slight credit rating downgrade'],
  },
  {
    vendorId: 'v-vantage',
    quarter: 'Q2 2026',
    tier: 'MODERATE',
    signals: ['Continued cash-flow stress', 'One sub-supplier legal notice filed'],
  },

  // Northbridge Packaging Solutions - Low / stable
  {
    vendorId: 'v-northbridge',
    quarter: 'Q3 2025',
    tier: 'LOW',
    signals: ['Clean screening history', 'No adverse media'],
  },
  {
    vendorId: 'v-northbridge',
    quarter: 'Q4 2025',
    tier: 'LOW',
    signals: ['Stable financials', 'No material findings'],
  },
  {
    vendorId: 'v-northbridge',
    quarter: 'Q1 2026',
    tier: 'LOW',
    signals: ['Routine re-screening completed, no changes'],
  },
  {
    vendorId: 'v-northbridge',
    quarter: 'Q2 2026',
    tier: 'LOW',
    signals: ['Continued clean record'],
  },
];
