import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Alert, BuildingId } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity') || undefined;
    const buildingId = searchParams.get('buildingId') || undefined;
    const status = searchParams.get('status') || undefined;

    // 1. Fetch real camera detection events from Supabase
    let eventsQuery = supabase
      .from('camera_events')
      .select('*')
      .order('detected_at', { ascending: false });

    if (buildingId && buildingId !== 'all') {
      eventsQuery = eventsQuery.eq('building_id', buildingId);
    }

    const { data: eventsData, error: eventsError } = await eventsQuery;

    // 2. Fetch any registered operational alerts from Supabase
    let alertsQuery = supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (buildingId && buildingId !== 'all') {
      alertsQuery = alertsQuery.eq('building_id', buildingId);
    }
    if (severity && severity !== 'all') {
      alertsQuery = alertsQuery.eq('severity', severity);
    }
    if (status && status !== 'all') {
      alertsQuery = alertsQuery.eq('status', status);
    }

    const { data: dbAlertsData } = await alertsQuery;

    // Map database alerts to camelCase Alert interface with safe array defaults
    const mappedDbAlerts: Alert[] = (dbAlertsData || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      buildingId: (row.building_id || 'engineering') as BuildingId,
      buildingName: row.building_name || 'Engineering Block',
      severity: row.severity || 'medium',
      status: row.status || 'active',
      category: row.category || 'energy',
      timestamp: row.timestamp || new Date(row.created_at || Date.now()).toLocaleTimeString(),
      equipmentId: row.equipment_id || 'EQ-GENERAL',
      sensorId: row.sensor_id || 'SN-GENERAL',
      supportingReadings: Array.isArray(row.supporting_readings) ? row.supporting_readings : [],
      possibleCauses: Array.isArray(row.possible_causes) ? row.possible_causes : [],
      nextActions: Array.isArray(row.next_actions) ? row.next_actions : [],
      recommendationId: row.recommendation_id,
      followUpId: row.follow_up_id,
    }));

    // 3. Map genuine camera events into operational alerts
    const mappedEventAlerts: Alert[] = (eventsData || []).map((evt) => {
      let sev: 'critical' | 'high' | 'medium' | 'low' = 'medium';
      if (evt.detected_class === 'overflowing_bins') sev = 'high';
      else if (evt.detected_class === 'plastic_waste') sev = 'medium';
      else if (evt.detected_class === 'food_waste') sev = 'low';
      else if (evt.detected_class === 'visible_litter') sev = 'medium';

      const formattedDate = new Date(evt.detected_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        id: evt.event_code || evt.id,
        title: `Vision Detection: ${evt.detected_class.replace('_', ' ').toUpperCase()}`,
        description: `Verified environmental issue detected by ${evt.model_name} (v${evt.model_version || '1.0'}) with ${(evt.confidence * 100).toFixed(1)}% model confidence. Evidence image saved.`,
        buildingId: evt.building_id as BuildingId,
        buildingName: evt.building_name,
        severity: sev,
        status: 'active',
        category: 'waste',
        timestamp: formattedDate,
        equipmentId: `CAM-${evt.camera_id.toUpperCase()}`,
        sensorId: `VIS-${evt.camera_id.toUpperCase()}`,
        supportingReadings: [
          {
            metric: 'Model Confidence',
            value: `${(evt.confidence * 100).toFixed(1)}%`,
            normalRange: '< 65.0% threshold',
            deviation: `+${((evt.confidence - 0.65) * 100).toFixed(1)}%`,
          },
          {
            metric: 'Persistence Status',
            value: evt.persistence_status || 'stored',
            normalRange: 'stored',
            deviation: '0%',
          },
        ],
        possibleCauses: [
          `Physical ${evt.detected_class.replace('_', ' ')} observed in active camera frame.`,
          'Waste container reached full capacity without scheduled emptying.',
          'Occupant discard outside designated disposal receptacle.',
        ],
        nextActions: [
          'Dispatch custodial crew to verify and collect waste.',
          'Review camera evidence snapshot to locate exact zone.',
          'Update container disposal log.',
        ],
      };
    });

    // 4. Combine real DB alerts with mapped camera events
    let allAlerts: Alert[] = [...mappedDbAlerts, ...mappedEventAlerts];

    // Apply severity filter to combined list if needed
    if (severity && severity !== 'all') {
      allAlerts = allAlerts.filter((a) => a.severity === severity);
    }
    if (status && status !== 'all') {
      allAlerts = allAlerts.filter((a) => a.status === status);
    }

    return NextResponse.json({ data: allAlerts, error: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching alerts from Supabase';
    return NextResponse.json(
      { data: [], error: { code: 'ALERTS_FETCH_FAILED', message } },
      { status: 500 }
    );
  }
}
