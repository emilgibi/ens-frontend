import { getValidationCount } from '@/lib/dal';
import { type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const data = await getValidationCount(req);
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: 'Failed to fetch validation count' },
      { status: 500 },
    );
  }
}
