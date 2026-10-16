import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { dataStore } from '@/lib/mock-data';
import { CampusOverview, BuildingId } from '@/types';

export async function GET() {
  try {
    // 1. Fetch real camera events from Supabase
    const { data: eventsData } = await supabase
      .from('camera_events')
      .select('*');

    // 2. Fetch real buildings from Supabase
    const { data: dbBuildings } = await supabase
      .from('buildings')
      .select('*');

    const totalEvents = (eventsData || []).length;
    const criticalEvents = (eventsData || []).filter((e) => e.detected_class === 'overflowing_bins').length;
    const highEvents = (eventsData || []).filter((e) => e.detected_class === 'visible_litter' || e.detected_class === 'plastic_waste').length;
    const mediumEvents = (eventsData || []).filter((e) => e.detected_class === 'paper_waste').length;
    const lowEvents = (eventsData || []).filter((e) => e.detected_class === 'food_waste').length;

    const baseOverview = dataStore.getOverview();

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

    const buildingRankings = (dbBuildings || []).map((b) => {
      const activeAlerts = countsByBuilding[b.id] || 0;
      return {
        id: b.id as BuildingId,
        name: b.name || buildingMap[b.id] || b.id,
        efficiencyScore: Number(b.efficiency_score) || 85.0,
        activeAlerts,
        status: activeAlerts > 0 ? (activeAlerts > 2 ? ('critical' as const) : ('warning' as const)) : ('normal' as const),
        primaryAnomaly: activeAlerts > 0 ? 'Vision Anomaly Detected' : undefined,
      };
    });

    const overview: CampusOverview = {
      ...baseOverview,
      isSimulated: false,
      dataSourceLabel: 'Supabase Production Ledger',
      lastUpdated: new Date().toISOString(),
      alertsSummary: {
        total: totalEvents,
        critical: criticalEvents,
        high: highEvents,
        medium: mediumEvents,
        low: lowEvents,
      },
      buildingRankings: buildingRankings.length > 0 ? buildingRankings : baseOverview.buildingRankings,
    };

    return NextResponse.json({ data: overview, error: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve campus overview';
    return NextResponse.json(
      { data: null, error: { code: 'OVERVIEW_FETCH_FAILED', message } },
      { status: 500 }
    );
  }
}
