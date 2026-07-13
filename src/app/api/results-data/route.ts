import { getResultsData } from '@/lib/dal';
import { type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { filters } = await req.json();
    const data = await getResultsData(req, filters);
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: 'Failed to fetch results data' },
      { status: 500 },
    );
  }
}
