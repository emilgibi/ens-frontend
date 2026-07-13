import { ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Rating, SupplierData } from '@/types';

import { GaugeCard } from './gauge-card';
import { RiskBadge } from './risk-badge';

type Field = {
  label: string;
  value: string | number | undefined | null;
  isLink?: boolean;
};

type ListField = {
  label: string;
  value: string | undefined | null;
};

type RiskIndicator = {
  label: string;
  rating: string;
};

function InfoField({ label, value, isLink }: Field) {
  return (
    <div>
      <div className="font-medium text-muted-foreground">{label}</div>
      <div className={isLink ? 'text-blue-600 flex' : ''}>
        {isLink && value ? (
          <>
            {value} <ExternalLink size={16} className="ml-1" />
          </>
        ) : (
          value || 'N/A'
        )}
      </div>
    </div>
  );
}

function InfoListField({ label, value }: ListField) {
  const items = value
    ? value
        .split('\n\n')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  return (
    <div>
      <div className="font-medium text-muted-foreground">{label}</div>
      <div className="space-y-1 text-sm">
        {items.length > 0 ? (
          items.map((item, idx) => (
            <div key={idx} className="leading-6">
              {item}
            </div>
          ))
        ) : (
          <div className="text-muted-foreground">No data</div>
        )}
      </div>
    </div>
  );
}

function MetaGrid({ fields }: { fields: Field[] }) {
  return (
    <div className="grid grid-cols-3 gap-4 text-sm">
      {fields.map((field) => (
        <InfoField key={field.label} {...field} />
      ))}
    </div>
  );
}

function ProfileGrid({
  fields,
  listFields,
}: {
  fields: Field[];
  listFields: ListField[];
}) {
  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      {fields.map((field) => (
        <InfoField key={field.label} {...field} />
      ))}
      {listFields.map((field) => (
        <InfoListField key={field.label} {...field} />
      ))}
    </div>
  );
}

function RiskIndicators({ indicators }: { indicators: RiskIndicator[] }) {
  return (
    <div className="space-y-4">
      {indicators.map((indicator) => (
        <div
          className="flex justify-between items-center"
          key={indicator.label}
        >
          <span className="text-sm">{indicator.label}</span>
          <RiskBadge risk={indicator.rating as Rating} />
        </div>
      ))}
    </div>
  );
}

export default function EntityUniverseOverview({
  profileData,
}: Readonly<{
  profileData: SupplierData;
}>) {
  const { profile, ratings, metadata } = profileData;
  console.log(profile);
  console.log(ratings);
  console.log("--------print her --------------")

  const profileFields: Field[] = [
    { label: 'Address', value: profile.address },
    { label: 'Alias', value: profile.alias },
    { label: 'Website', value: profile.website, isLink: true },
    { label: 'Incorporation Date', value: profile.incorporation_date },
    {
      label: 'e-Filing Status',
      value: (
        <Badge
          variant="default"
          className={`text-xs mt-1 ${
            profile.active_status?.toLowerCase() === 'active'
              ? 'bg-primary  hover:bg-primary/80'
              : 'bg-primary/10  hover:bg-primary/20'
          }`}
        >
          {profile.e_filing_status || 'Unknown'}
        </Badge>
      ) as any,
    },
    { label: 'Revenue', value: profile.revenue },
    { label: 'Employee', value: profile.employee },
    { label: 'Corporate Group', value: profile.corporate_group },
    { label: 'Category', value: profile.category },
  ];

  const profileListFields: ListField[] = [
    { label: 'Shareholders', value: profile.shareholders },
    { label: 'Key Executives', value: profile.key_executives },
  ];

  // Meta fields
  const metaFields: Field[] = [
    { label: 'ID', value: profile.external_vendor_id },
    { label: 'System ID', value: metadata.ens_id },
    { label: 'Latest Session ID', value: metadata.last_session_id },
    { label: 'Name', value: profile.name },
    { label: 'National Id', value: profile.pan_id },
    { label: 'City', value: profile.location },
    { label: 'Address', value: profile.address },
    { label: 'Country', value: profile.location },
    {
      label: 'Last Screened Date',
      value: new Date(metadata.last_screened_date).toLocaleDateString(),
    },
  ];

  // Risk indicators
  const riskIndicators: RiskIndicator[] = [
    { label: 'Entity Existance',
      rating: ratings.entity_existence},
    {
      label: 'Financials',
      rating: ratings.financials,
    },
    {
      label: 'Adverse Media',
      rating: ratings.adverse_media,
    },
    {
      label: 'Legal',
      rating: ratings.legal,
    },
    {
      label: 'Additional Indicators',
      rating: ratings.cyber_esg,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-6">
        <Card className="gap-0">
          <CardHeader>
            <CardTitle className="text-md font-medium">
              Company Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileGrid
              fields={profileFields}
              listFields={profileListFields}
            />
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader>
            <CardTitle>Meta Info</CardTitle>
          </CardHeader>
          <CardContent>
            <MetaGrid fields={metaFields} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <GaugeCard rating={ratings.supplier as Rating} />
        <Card>
          <CardHeader>
            <CardTitle className="text-md font-medium">
              Risk Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RiskIndicators indicators={riskIndicators} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
