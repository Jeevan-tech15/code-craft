import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PYTHON_SERVICE_URL = process.env.CAMERA_SERVICE_URL || 'http://127.0.0.1:8000';

const CAMERA_MAPPINGS: Record<string, { building_id: string; building_name: string; zone: string }> = {
  'camera-1': { building_id: 'engineering', building_name: 'Engineering Block', zone: 'North Rooftop & Prototyping Lab' },
  'camera-2': { building_id: 'library', building_name: 'Central Library', zone: 'Basement Hydronic Loop & Restrooms' },
  'camera-3': { building_id: 'laboratory', building_name: 'Advanced Science Laboratory', zone: 'West Wet Lab & Cleanroom Sector' },
  'camera-4': { building_id: 'cafeteria', building_name: 'Campus Dining Commons', zone: 'South Kitchen & Bio-Digester Hub' },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cameraId = searchParams.get('camera_id');
    const buildingId = searchParams.get('building_id');
    const category = searchParams.get('category');
    const reviewStatus = searchParams.get('review_status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // 1. Fetch logical camera configurations for location/zone resolution
    let cameraMetaMap: Record<string, { building_id: string; building_name: string; zone?: string }> = { ...CAMERA_MAPPINGS };
    try {
      const { data: camsData } = await supabase.from('logical_cameras').select('*');
      if (camsData && camsData.length > 0) {
        camsData.forEach((c: any) => {
          cameraMetaMap[c.id] = {
            building_id: c.building_id,
            building_name: c.building_name,
            zone: c.zone || undefined,
          };
        });
      }
    } catch (metaErr) {
      console.warn('Could not query logical_cameras table, using CAMERA_MAPPINGS fallback:', metaErr);
    }

    // 2. Primary: Direct query from Supabase public.camera_events
    let rawEvents: any[] = [];
    let dataSource = 'supabase';

    try {
      let query = supabase
        .from('camera_events')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(limit);

      if (cameraId && cameraId !== 'all') query = query.eq('camera_id', cameraId);
      if (buildingId && buildingId !== 'all') query = query.eq('building_id', buildingId);

      const { data, error } = await query;
      if (!error && data !== null && data.length > 0) {
        rawEvents = data;
      } else if (error) {
        console.warn('Supabase query error:', error.message);
      }
    } catch (sbErr) {
      console.warn('Direct Supabase camera_events query failed, falling back to Python service:', sbErr);
    }

    // 3. Fallback: Query Python camera service if Supabase has 0 records or failed
    if (rawEvents.length === 0) {
      try {
        const params = new URLSearchParams();
        if (cameraId && cameraId !== 'all') params.set('camera_id', cameraId);
        if (buildingId && buildingId !== 'all') params.set('building_id', buildingId);
        if (category && category !== 'all') params.set('category', category);
        if (reviewStatus && reviewStatus !== 'all') params.set('review_status', reviewStatus);
        params.set('limit', String(limit));

        const res = await fetch(`${PYTHON_SERVICE_URL}/events?${params.toString()}`, {
          cache: 'no-store',
        });

        if (res.ok) {
          const json = await res.json();
          rawEvents = json.events || [];
          dataSource = 'python_service';
        }
      } catch (pyErr) {
        console.warn('Python camera service also offline:', pyErr);
      }
    }

    const supabaseBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') || '';

    // 4. Enforce strict location attribution, zone resolution, and valid image URLs
    const processedEvents = rawEvents.map((ev: any) => {
      const camMeta = cameraMetaMap[ev.camera_id] || CAMERA_MAPPINGS[ev.camera_id];
      const resolvedBuildingId = ev.building_id || camMeta?.building_id || 'engineering';
      const resolvedBuildingName = ev.building_name || camMeta?.building_name || 'Engineering Block';
      const resolvedZone = ev.zone || camMeta?.zone || 'Zone not configured';

      // Fix image URL resolution
      let imgUrl = ev.evidence_image_url;
      if (!imgUrl && ev.evidence_storage_path) {
        if (ev.evidence_storage_path.startsWith('camera-evidence/')) {
          imgUrl = `${supabaseBaseUrl}/storage/v1/object/public/${ev.evidence_storage_path}`;
        } else if (ev.event_code) {
          imgUrl = `/evidence/${ev.event_code}.jpg`;
        }
      } else if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('/evidence/')) {
        imgUrl = `/evidence/${imgUrl.replace(/^.*[\\\/]/, '')}`;
      }

      return {
        ...ev,
        building_id: resolvedBuildingId,
        building_name: resolvedBuildingName,
        zone: resolvedZone,
        evidence_image_url: imgUrl,
        timestamp: ev.detected_at || ev.timestamp || new Date().toISOString(),
      };
    });

    // In-memory filter for category and review status if provided
    let finalEvents = processedEvents;
    if (category && category !== 'all') {
      finalEvents = finalEvents.filter(
        (e) => (e.waste_category || e.detected_class || '').toLowerCase() === category.toLowerCase()
      );
    }
    if (reviewStatus && reviewStatus !== 'all') {
      finalEvents = finalEvents.filter(
        (e) => (e.review_status || 'pending_review').toLowerCase() === reviewStatus.toLowerCase()
      );
    }

    return NextResponse.json({ data: finalEvents, error: null, source: dataSource });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch camera events';
    return NextResponse.json({
      data: [],
      error: { code: 'EVENTS_SERVICE_OFFLINE', message: msg },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { camera_id, detected_class, confidence, item_name, waste_category } = body;

    // Server-side validation of logical camera
    if (!camera_id || !CAMERA_MAPPINGS[camera_id]) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'INVALID_CAMERA',
            message: `Camera '${camera_id}' is not a registered logical campus camera.`,
          },
        },
        { status: 400 }
      );
    }

    // Call Python service to record real detection with server-validated attribution
    const res = await fetch(`${PYTHON_SERVICE_URL}/events/record-detection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        camera_id,
        detected_class,
        confidence: Number(confidence),
        item_name,
        waste_category,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Record detection failed HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return NextResponse.json({ data, error: null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Detection persistence failed';
    return NextResponse.json(
      {
        data: null,
        error: { code: 'PERSISTENCE_ERROR', message: msg },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_id, review_status, notes } = body;

    if (!event_id || !review_status) {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_INPUT', message: 'event_id and review_status are required' } },
        { status: 400 }
      );
    }

    // 1. Update in Supabase
    try {
      const payload: Record<string, unknown> = { review_status };
      if (notes) payload.notes = notes;
      await supabase.from('camera_events').update(payload).eq('id', event_id);
    } catch (e) {
      console.warn('Supabase review update failed:', e);
    }

    // 2. Also notify Python service
    try {
      await fetch(`${PYTHON_SERVICE_URL}/events/${event_id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_status, notes }),
      });
    } catch (e) {
      console.warn('Python service review update notice failed:', e);
    }

    return NextResponse.json({
      data: { event_id, review_status, notes },
      error: null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update review status';
    return NextResponse.json(
      { data: null, error: { code: 'REVIEW_UPDATE_FAILED', message: msg } },
      { status: 500 }
    );
  }
}
