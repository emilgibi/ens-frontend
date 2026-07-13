import { NextResponse } from 'next/server';
import { getUniqueCountries } from '@/lib/dal';

export async function GET() {
  try {
    const countries = await getUniqueCountries();
    return NextResponse.json({ countries });
  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 },
    );
  }
}
