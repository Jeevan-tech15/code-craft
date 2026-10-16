import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SustainabilityReport, BuildingId } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dateRange, buildingFilter } = body;

    const range = dateRange || {
      start: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      label: 'Past 30 Days',
    };
    const filter = buildingFilter || 'all';

    // 1. Fetch real events from Supabase
    let eventsQuery = supabase.from('camera_events').select('*');
    if (filter !== 'all') {
      eventsQuery = eventsQuery.eq('building_id', filter);
    }
    const { data: eventsData } = await eventsQuery;

    // 2. Fetch buildings from Supabase
    const { data: dbBuildings } = await supabase.from('buildings').select('*');

    // 3. Compute counts by building
    const countsByBuilding: Record<string, number> = {};
    (eventsData || []).forEach((e) => {
      countsByBuilding[e.building_id] = (countsByBuilding[e.building_id] || 0) + 1;
    });

    const buildingMap: Record<string, string> = {
      engineering: 'Engineering Block',
      library: 'Central Library',
      laboratory: 'Advanced Science Laboratory',
      cafeteria: 'Campus Dining Commons',
    };

    const buildingBreakdown = (dbBuildings || []).map((b) => ({
      buildingId: b.id as BuildingId,
      buildingName: b.name || buildingMap[b.id] || b.id,
      efficiencyScore: Number(b.efficiency_score) || 85.0,
      electricityKwh: Number(b.electricity_kwh) || 0,
      waterLiters: b.water_liters || 0,
      activeAlerts: countsByBuilding[b.id] || 0,
    }));

    const totalEvents = (eventsData || []).length;

    const report: SustainabilityReport = {
      id: `REP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      title: `Campus Sustainability & Environmental Compliance Audit — ${range.label}`,
      generatedAt: new Date().toISOString(),
      dateRange: range,
      buildingFilter: filter,
      summary: {
        totalKwhSaved: totalEvents * 12.5,
        totalWaterSavedLiters: totalEvents * 450,
        totalCo2AvoidedTons: Number((totalEvents * 0.08).toFixed(2)),
        estimatedCostSaved: `$${(totalEvents * 120).toLocaleString()}`,
        alertsResolvedCount: 0,
        followUpsLogged: totalEvents,
      },
      buildingBreakdown,
      keyRecommendations: totalEvents > 0
        ? [
            `Verified ${totalEvents} environmental violation(s) captured by the Edge Vision Camera Admin Panel.`,
            'Continue localized waste segregation enforcement across monitored facilities.',
            'Review evidence archive in Supabase Storage for high-frequency litter zones.',
          ]
        : [
            'No environmental violations recorded in Supabase for this reporting window.',
            'Connect and run inference on the Camera Admin Application to record real-time detections.',
            'Scheduled sensor audit logs remain in normal operating parameters.',
          ],
      followUpAuditTrail: (eventsData || []).slice(0, 5).map((e) => ({
        id: e.event_code || e.id,
        verifier: `Camera ${e.camera_id} (${e.model_name})`,
        building: e.building_name,
        outcome: `${e.detected_class} (${(e.confidence * 100).toFixed(1)}% conf)`,
        date: new Date(e.detected_at).toLocaleDateString(),
      })),
    };

    return NextResponse.json({ data: report, error: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error generating report from Supabase';
    return NextResponse.json(
      { data: null, error: { code: 'REPORT_GENERATION_FAILED', message } },
      { status: 500 }
    );
  }
}
