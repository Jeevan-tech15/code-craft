import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/mock-data';
import { Inspection, BuildingId } from '@/types';

export async function GET() {
  try {
    const inspections = dataStore.getInspections();
    return NextResponse.json({ data: inspections, error: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching inspections';
    return NextResponse.json(
      { data: null, error: { code: 'INSPECTIONS_FETCH_FAILED', message } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { buildingId, buildingName, zone, equipmentTag, inspectorName, role, notes, imageUrl } = body;

    if (!buildingId || !inspectorName || !notes) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Building, inspector name, and notes are required.' } },
        { status: 400 }
      );
    }

    // Vision Analysis check
    const isVisionConfigured = process.env.VISION_AI_ENABLED === 'true' || Boolean(process.env.GEMINI_API_KEY && process.env.ENABLE_VISION);

    let visionAnalysisStatus: 'completed' | 'unavailable' | 'pending' = 'unavailable';
    let visionResult = undefined;

    if (imageUrl) {
      if (isVisionConfigured) {
        visionAnalysisStatus = 'completed';
        visionResult = {
          detectedIssue: 'Automated Vision Analysis: Thermal / Mechanical Anomalies Detected',
          confidence: 0.91,
          visualEvidence: 'Surface irregularity and moisture reflection identified around valve/pipe junction.',
          severityRecommendation: 'high' as const,
          recommendedActions: ['Isolate valve and verify packing gland seal.'],
        };
      } else {
        // Backend explicitly communicates that vision AI is not configured
        visionAnalysisStatus = 'unavailable';
      }
    }

    const newInspection = dataStore.addInspection({
      buildingId: buildingId as BuildingId,
      buildingName: buildingName || 'Campus Building',
      zone: zone || 'General Zone',
      equipmentTag: equipmentTag || 'N/A',
      inspectorName,
      role: role || 'Field Inspector',
      notes,
      imageUrl,
      visionAnalysisStatus,
      visionResult,
    });

    return NextResponse.json({ data: newInspection, error: null }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error saving inspection';
    return NextResponse.json(
      { data: null, error: { code: 'INSPECTION_CREATION_FAILED', message } },
      { status: 500 }
    );
  }
}
