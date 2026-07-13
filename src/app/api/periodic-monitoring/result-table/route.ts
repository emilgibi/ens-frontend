import { getPeriodicMonitoringResultTableData } from '@/lib/dal';
import { type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    let filters = {};
    const contentType = req.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        const body = await req.text();
        if (body.trim()) {
          const parsed = JSON.parse(body);
          filters = parsed.filters || {};
        }
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
      }
    }

    const data = await getPeriodicMonitoringResultTableData(req, filters);
    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: 'Failed to fetch results data' },
      { status: 500 },
    );
  }
}
