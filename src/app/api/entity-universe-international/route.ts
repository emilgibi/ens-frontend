import { NextRequest } from 'next/server';
import { getAllInternationalEntities } from '@/lib/orbis-entity-universe';

function toCamelCase(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function camelCaseRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[toCamelCase(key)] = value;
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') ?? '1');
    const pageSize = Number(searchParams.get('pageSize') ?? '10');
    const sortBy = searchParams.get('sortBy') ?? 'name';
    const sortOrder = searchParams.get('sortOrder') ?? 'asc';

    let filters: Record<string, string | string[]> = {};
    try {
      const body = await req.json();
      filters = body?.filters ?? {};
    } catch {
      // no body — fine, just means no filters
    }

    let entities = (await getAllInternationalEntities()).map((e) => camelCaseRow(e));

    const countryFilter = filters['country'];
    if (countryFilter) {
      const wanted = Array.isArray(countryFilter) ? countryFilter : [countryFilter];
      entities = entities.filter((e) => wanted.includes(e['country'] as string));
    }

    entities.sort((a, b) => {
      const valA = (a[sortBy] ?? a['name'] ?? '').toString();
      const valB = (b[sortBy] ?? b['name'] ?? '').toString();
      const diff = valA.localeCompare(valB);
      return sortOrder === 'asc' ? diff : -diff;
    });

    const totalRecords = entities.length;
    const start = (page - 1) * pageSize;
    const data = entities.slice(start, start + pageSize);

    return Response.json({ data, totalRecords });
  } catch (err: any) {
    console.error('[entity-universe-international] error:', err);
    return Response.json(
      { data: [], totalRecords: 0, error: err?.message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}