import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/mock-data';

export async function GET() {
  try {
    const recommendations = dataStore.getRecommendations();
    return NextResponse.json({ data: recommendations, error: null });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { data: null, error: { code: 'FETCH_RECOMMENDATIONS_ERROR', message: msg } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Missing id or status in request body' } },
        { status: 400 }
      );
    }

    const updated = dataStore.updateRecommendationStatus(id, status);
    if (!updated) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: `Recommendation ${id} not found` } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updated, error: null });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { data: null, error: { code: 'UPDATE_RECOMMENDATION_ERROR', message: msg } },
      { status: 500 }
    );
  }
}
