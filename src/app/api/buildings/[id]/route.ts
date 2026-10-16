import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/mock-data';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const building = dataStore.getBuildingById(id);

    if (!building) {
      return NextResponse.json(
        { data: null, error: { code: 'BUILDING_NOT_FOUND', message: `Building with ID '${id}' not found.` } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: building, error: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error retrieving building details';
    return NextResponse.json(
      { data: null, error: { code: 'BUILDING_QUERY_ERROR', message } },
      { status: 500 }
    );
  }
}
