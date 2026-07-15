import { NextRequest, NextResponse } from 'next/server';

const ORCH = process.env.SERVER_APPLICATION_ORCHESTRATION || process.env.NEXT_PUBLIC_APPLICATION_ORCHESTRATION;

export async function GET(req: NextRequest) {
  console.log('=== LOCATION RISK ROUTE HIT ===');
  console.log('ORCH URL:', ORCH);

  const { searchParams } = req.nextUrl;
  const location = searchParams.get('location')?.trim();
  console.log('Location param:', location);

  if (!location) {
    return NextResponse.json({ error: 'location required' }, { status: 400 });
  }

  const politicalUrl = `${ORCH}/location-risk/political-static?location=${encodeURIComponent(location)}`;
  const climateUrl   = `${ORCH}/location-risk/climate-static?location=${encodeURIComponent(location)}`;
  const infraUrl     = `${ORCH}/location-risk/infrastructure-static?location=${encodeURIComponent(location)}`;

  console.log('Calling political:', politicalUrl);
  console.log('Calling climate:  ', climateUrl);
  console.log('Calling infra:    ', infraUrl);

  const [pol, cli, inf] = await Promise.allSettled([
    fetch(politicalUrl).then(async r => {
      console.log('Political response status:', r.status);
      const text = await r.text();
      console.log('Political response body (first 200):', text.slice(0, 200));
      return JSON.parse(text);
    }),
    fetch(climateUrl).then(async r => {
      console.log('Climate response status:', r.status);
      const text = await r.text();
      console.log('Climate response body (first 200):', text.slice(0, 200));
      return JSON.parse(text);
    }),
    fetch(infraUrl).then(async r => {
      console.log('Infra response status:', r.status);
      const text = await r.text();
      console.log('Infra response body (first 200):', text.slice(0, 200));
      return JSON.parse(text);
    }),
  ]);

  console.log('Political settled:', pol.status);
  console.log('Climate settled:  ', cli.status);
  console.log('Infra settled:    ', inf.status);

  return NextResponse.json({
    political:      pol.status === 'fulfilled' ? pol.value : null,
    politicalError: pol.status === 'rejected'  ? String((pol.reason as any)?.message ?? pol.reason) : null,
    climate:        cli.status === 'fulfilled' ? cli.value : null,
    climateError:   cli.status === 'rejected'  ? String((cli.reason as any)?.message ?? cli.reason) : null,
    infra:          inf.status === 'fulfilled' ? inf.value : null,
    infraError:     inf.status === 'rejected'  ? String((inf.reason as any)?.message ?? inf.reason) : null,
  });
}