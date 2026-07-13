import { getEntityUniverseByGroup } from '@/lib/dal';
import { type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { filters } = await req.json();

  try {
    const data = await getEntityUniverseByGroup(req, filters);
    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
