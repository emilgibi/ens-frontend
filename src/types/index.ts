export interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  subitems?: {
    name: string;
    href: string;
    icon?: any;
  }[];
}

export type FeedItem = {
  id: string;
  ensId: string;
  notificationSessionId: string;
  type: 'ALERT' | 'RATING_CHANGE' | 'UPDATE';
  category: string;
  title: string;
  content: string;
  timestamp: string;
  supplierName: string;
};

export type SupplierProfile = {
  name: string;
  location: string;
  address: string;
  website: string;
  active_status: string;
  operation_type: string;
  legal_status: string;
  pan_id: string;
  alias: string;
  incorporation_date: string;
  revenue: string;
  corporate_group: string;
  shareholders: string;
  key_executives: string;
  employee: string;
  category: string;
  e_filing_status: string;
  overall_supplier_rating: string;
  unmodified_name: string;
  unmodified_address?: string | null;
  unmodified_postcode?: string | null;
  unmodified_city?: string | null;
  unmodified_country?: string | null;
  unmodified_national_id?: string | null;
  unmodified_state?: string | null;
  create_time: string;
  external_vendor_id: string;
  update_time: string;
  id: number;
};

export type SupplierRatings = {
  supplier: string;
  financials: string;
  entity_existence: string;
  adverse_media: string;
  legal: string;
  cyber_esg: string;
};

export type SupplierMetadata = {
  ens_id: string;
  last_session_id: string;
  last_screened_date: string;
};

export type SupplierData = {
  profile: SupplierProfile;
  ratings: SupplierRatings;
  metadata: SupplierMetadata;
};

export type RiskLevel = 'high' | 'medium' | 'low' | 'none' | 'no alerts';

export type Rating = 'high' | 'medium' | 'low';

// --- KPI Finding Item ---
export interface KpiFinding {
  kpi_area: string;
  kpi_code: string;
  kpi_definition: string;
  kpi_rating: 'High' | 'Medium' | 'Low'; // rating enums seen in your data
  kpi_flag: boolean;
  kpi_details: string;
}

// ---  Findings Section ---
export interface Findings {
  entity_existence?: KpiFinding[];
  legal?: KpiFinding[];
  financials?: KpiFinding[];
  adverse_media?: KpiFinding[];
  sanctions?: KpiFinding[];
  government_political?: KpiFinding[];
  bribery_corruption_overall?: KpiFinding[];
  cyber_esg?: KpiFinding[];
}

// --- Metadata Section ---
export interface Metadata {
  ens_id: string;
  last_session_id: string;
  last_screened_date: string; // ISO date string
}

// --- Main Root Object ---
export interface SupplierFindings {
  ratings: SupplierRatings;
  findings: Findings;
  metadata: Metadata;
}

export type Status =
  | 'QUEUED'
  | 'NOT_STARTED'
  | 'STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'PENDING'
  | 'SKIP'
  | 'SKIPPED';

// --- Screening pipeline selection (Probe42 / Moody's) ---
export type ScreeningType = 'domestic' | 'international';

export const SCREENING_TYPE_META: Record<
  ScreeningType,
  { label: string; provider: string; shortLabel: string }
> = {
  domestic: {
    label: 'Domestic Vendors',
    provider: 'Probe42',
    shortLabel: 'Domestic · Probe42',
  },
  international: {
    label: 'International Vendors',
    provider: "Moody's",
    shortLabel: "International · Moody's",
  },
};

