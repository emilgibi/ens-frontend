import { getValidationResults } from '@/lib/dal';
import { type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { filters } = await req.json();
    const data = await getValidationResults(req, filters);
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: 'Failed to fetch validation results' },
      { status: 500 },
    );
  }
}
