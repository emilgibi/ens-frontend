import { getSessionInfo } from '@/lib/dal';
import { type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { filters } = await req.json();

  try {
    const data = await getSessionInfo(req, filters);
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
