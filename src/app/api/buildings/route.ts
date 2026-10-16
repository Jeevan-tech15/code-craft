import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { initialBuildings } from '@/lib/mock-data';
import { Building, BuildingId } from '@/types';

export async function GET() {
  try {
    // 1. Fetch buildings from Supabase
    const { data: dbBuildings, error: bError } = await supabase
      .from('buildings')
      .select('*')
      .order('id');

    // 2. Fetch camera events count per building to compute real active alerts
    const { data: eventsData } = await supabase
      .from('camera_events')
      .select('building_id, detected_class, detected_at, confidence, event_code');

    const countsByBuilding: Record<string, number> = {};
    const latestEventByBuilding: Record<string, any> = {};

    (eventsData || []).forEach((e) => {
      countsByBuilding[e.building_id] = (countsByBuilding[e.building_id] || 0) + 1;
      if (!latestEventByBuilding[e.building_id]) {
        latestEventByBuilding[e.building_id] = e;
      }
    });

    if (dbBuildings && dbBuildings.length > 0) {
      const buildings: Building[] = dbBuildings.map((b) => {
        const id = b.id as BuildingId;
        const initial = initialBuildings[id] || {};
        const realAlertsCount = countsByBuilding[id] || 0;
        const latestEvt = latestEventByBuilding[id];

        const anomalies = latestEvt
          ? [
              {
                id: latestEvt.event_code,
                title: `Vision: ${latestEvt.detected_class.replace('_', ' ').toUpperCase()}`,
                description: `Real-time environmental detection with ${(latestEvt.confidence * 100).toFixed(1)}% confidence.`,
                severity: 'high' as const,
                timestamp: new Date(latestEvt.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                equipmentId: `CAM-${id.toUpperCase()}`,
                evidenceValue: `${(latestEvt.confidence * 100).toFixed(1)}% confidence`,
                baselineValue: '< 65.0% threshold',
                possibleCause: 'Visual object detected by environmental vision model.',
              },
            ]
          : [];

        return {
          id,
          name: b.name,
          code: b.code,
          tagline: b.tagline || initial.tagline || '',
          description: b.description || initial.description || '',
          status: realAlertsCount > 0 ? (realAlertsCount > 2 ? 'critical' : 'warning') : 'normal',
          efficiencyScore: Number(b.efficiency_score) || 85.0,
          activeAlertsCount: realAlertsCount,
          areaSqFt: b.area_sq_ft || initial.areaSqFt || 50000,
          occupancy: {
            current: b.occupancy_current || initial.occupancy?.current || 400,
            capacity: b.occupancy_capacity || initial.occupancy?.capacity || 600,
          },
          resources: {
            electricityKwh: Number(b.electricity_kwh) || initial.resources?.electricityKwh || 500,
            waterLiters: b.water_liters || initial.resources?.waterLiters || 8000,
            wasteKg: b.waste_kg || initial.resources?.wasteKg || 150,
            carbonTons: Number(b.carbon_tons) || initial.resources?.carbonTons || 0.6,
            solarGenerationKwh: Number(b.solar_generation_kwh) || initial.resources?.solarGenerationKwh || 0,
          },
          historicalTrend: initial.historicalTrend || [],
          anomalies,
          sensors: initial.sensors || [],
          location: {
            zone: b.zone || initial.location?.zone || 'Campus Quad',
            floorCount: b.floor_count || initial.location?.floorCount || 3,
          },
        };
      });

      return NextResponse.json({ data: buildings, error: null });
    }

    // Fallback if DB is empty
    return NextResponse.json({ data: Object.values(initialBuildings), error: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve buildings list';
    return NextResponse.json(
      { data: Object.values(initialBuildings), error: { code: 'BUILDINGS_FETCH_FAILED', message } },
      { status: 500 }
    );
  }
}
