import { getSupplierData } from '@/lib/dal';
import { type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { filters } = await req.json();
  const data = await getSupplierData(req, filters);
  return Response.json(data);
}
