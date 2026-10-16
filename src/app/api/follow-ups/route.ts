import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/mock-data';
import { BuildingId } from '@/types';

export async function GET() {
  try {
    const followUps = dataStore.getFollowUps();
    return NextResponse.json({ data: followUps, error: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching follow-ups';
    return NextResponse.json(
      { data: null, error: { code: 'FOLLOWUPS_FETCH_FAILED', message } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      alertId,
      recommendationId,
      buildingId,
      buildingName,
      verifierName,
      role,
      preReading,
      postReading,
      status,
      notes,
    } = body;

    if (!buildingId || !verifierName || !preReading || !postReading || !status || !notes) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'All verification fields (building, verifier, pre/post readings, status, notes) are required.',
          },
        },
        { status: 400 }
      );
    }

    const newFollowUp = dataStore.addFollowUp({
      alertId,
      recommendationId,
      buildingId: buildingId as BuildingId,
      buildingName: buildingName || 'Campus Building',
      verifierName,
      role: role || 'Field Verifier',
      preReading,
      postReading,
      status,
      notes,
    });

    return NextResponse.json({ data: newFollowUp, error: null }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error recording follow-up';
    return NextResponse.json(
      { data: null, error: { code: 'FOLLOWUP_CREATION_FAILED', message } },
      { status: 500 }
    );
  }
}
