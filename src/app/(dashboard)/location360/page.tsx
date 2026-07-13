import Location360Client from '@/components/location360/Location360Client';

export const metadata = {
  title: 'Location360 | RiskLens',
  description: 'Static location risk assessment across political, climate, and infrastructure dimensions.',
};

export default function Location360Page() {
  return <Location360Client />;
}
