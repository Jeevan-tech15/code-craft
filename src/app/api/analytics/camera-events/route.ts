import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface RawEvent {
  id: string;
  camera_id: string;
  building_id?: string;
  building_name?: string;
  detected_class: string;
  item_name?: string;
  waste_category?: string;
  confidence?: number;
  similarity_score?: number;
  timestamp: string;
  evidence_storage_path?: string;
  evidence_image_url?: string;
  review_status?: string;
  zone?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'month';
    const buildingId = searchParams.get('building_id');
    const cameraId = searchParams.get('camera_id');
    const category = searchParams.get('category');

    let events: RawEvent[] = [];
    let dataSource = 'supabase';

    // 1. Try querying Supabase
    try {
      const supabase = getSupabase();
      let query = supabase.from('camera_events').select('*');

      if (buildingId && buildingId !== 'all') {
        query = query.eq('building_id', buildingId);
      }
      if (cameraId && cameraId !== 'all') {
        query = query.eq('camera_id', cameraId);
      }
      if (category && category !== 'all') {
        query = query.or(`waste_category.eq.${category},detected_class.eq.${category}`);
      }

      // Filter by timeframe
      const now = new Date();
      if (timeframe === 'day') {
        const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('timestamp', since);
      } else if (timeframe === 'week') {
        const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('timestamp', since);
      } else if (timeframe === 'month') {
        const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('timestamp', since);
      }

      query = query.order('timestamp', { ascending: false });

      const { data, error } = await query;
      if (error) {
        throw error;
      }
      if (data) {
        events = data as RawEvent[];
      }
    } catch (dbErr: any) {
      console.warn('Supabase query failed, falling back to local events ledger:', dbErr.message);
      dataSource = 'local_ledger_fallback';

      // Fallback to local Python service ledger if Supabase is offline
      const localLedgerPath = path.resolve(process.cwd(), 'camera_service/data/events.json');
      if (fs.existsSync(localLedgerPath)) {
        try {
          const raw = fs.readFileSync(localLedgerPath, 'utf8');
          const allLocal: RawEvent[] = JSON.parse(raw);
          events = allLocal.filter((e) => {
            if (buildingId && buildingId !== 'all' && e.building_id !== buildingId) return false;
            if (cameraId && cameraId !== 'all' && e.camera_id !== cameraId) return false;
            if (category && category !== 'all' && e.waste_category !== category && e.detected_class !== category) return false;
            return true;
          });
        } catch (fileErr) {
          console.error('Failed to read local ledger:', fileErr);
        }
      }
    }

    const totalEvents = events.length;

    // Honest handling: If database is empty, return empty metrics rather than invented trends
    if (totalEvents === 0) {
      return NextResponse.json({
        data: {
          dataSource,
          timeframe,
          totalEvents: 0,
          insufficientData: true,
          message:
            'No real camera detection events found for the selected timeframe. Use the Python camera service to record live visual-memory waste detections.',
          confirmedWasteCount: 0,
          pendingReviewCount: 0,
          falsePositiveCount: 0,
          resolvedCount: 0,
          categoryBreakdown: [],
          buildingComparison: [
            { buildingId: 'engineering', buildingName: 'Engineering Block', count: 0 },
            { buildingId: 'library', buildingName: 'Central Library', count: 0 },
            { buildingId: 'laboratory', buildingName: 'Advanced Science Laboratory', count: 0 },
            { buildingId: 'cafeteria', buildingName: 'Campus Dining Commons', count: 0 },
          ],
          cameraBreakdown: [
            { cameraId: 'camera-1', buildingName: 'Engineering Block', count: 0, isSharedHardware: true },
            { cameraId: 'camera-2', buildingName: 'Central Library', count: 0, isSharedHardware: true },
            { cameraId: 'camera-3', buildingName: 'Advanced Science Laboratory', count: 0, isSharedHardware: true },
            { cameraId: 'camera-4', buildingName: 'Campus Dining Commons', count: 0, isSharedHardware: true },
          ],
          timeline: [],
          evidenceUploads: {
            uploadedCount: 0,
            failedOrLocalCount: 0,
            uploadSuccessRatePercent: 0,
          },
          recentEvents: [],
        },
        error: null,
      });
    }

    // Status breakdown
    let confirmedWasteCount = 0;
    let pendingReviewCount = 0;
    let falsePositiveCount = 0;
    let resolvedCount = 0;

    // Evidence upload stats
    let uploadedCount = 0;
    let failedOrLocalCount = 0;

    // Category counts
    const categoryCounts: Record<string, number> = {};

    // Building counts
    const buildingCounts: Record<string, { count: number; name: string }> = {
      engineering: { count: 0, name: 'Engineering Block' },
      library: { count: 0, name: 'Central Library' },
      laboratory: { count: 0, name: 'Advanced Science Laboratory' },
      cafeteria: { count: 0, name: 'Campus Dining Commons' },
    };

    // Camera counts
    const cameraCounts: Record<string, { count: number; name: string }> = {
      'camera-1': { count: 0, name: 'Engineering Block' },
      'camera-2': { count: 0, name: 'Central Library' },
      'camera-3': { count: 0, name: 'Advanced Science Laboratory' },
      'camera-4': { count: 0, name: 'Campus Dining Commons' },
    };

    // Timeline counts (by day YYYY-MM-DD)
    const timelineMap: Record<string, number> = {};

    events.forEach((ev) => {
      // Review status
      const status = ev.review_status || 'pending_review';
      if (status === 'verified_waste') confirmedWasteCount++;
      else if (status === 'false_positive') falsePositiveCount++;
      else if (status === 'resolved') resolvedCount++;
      else pendingReviewCount++;

      // Evidence upload status
      if (ev.evidence_storage_path && ev.evidence_image_url?.includes('supabase.co')) {
        uploadedCount++;
      } else {
        failedOrLocalCount++;
      }

      // Category
      const cat = (ev.waste_category || ev.detected_class || 'general').toLowerCase();
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      // Building
      const bId = ev.building_id || 'engineering';
      if (!buildingCounts[bId]) {
        buildingCounts[bId] = { count: 0, name: ev.building_name || bId };
      }
      buildingCounts[bId].count++;

      // Camera
      const cId = ev.camera_id || 'camera-1';
      if (!cameraCounts[cId]) {
        cameraCounts[cId] = { count: 0, name: ev.building_name || cId };
      }
      cameraCounts[cId].count++;

      // Timeline
      const dateKey = ev.timestamp ? ev.timestamp.substring(0, 10) : '2026-10-16';
      timelineMap[dateKey] = (timelineMap[dateKey] || 0) + 1;
    });

    const categoryBreakdown = Object.entries(categoryCounts).map(([cat, count]) => ({
      category: cat.charAt(0).toUpperCase() + cat.slice(1),
      count,
      percentage: Math.round((count / totalEvents) * 100),
    }));

    const buildingComparison = Object.entries(buildingCounts).map(([bId, info]) => ({
      buildingId: bId,
      buildingName: info.name,
      count: info.count,
    }));

    const cameraBreakdown = Object.entries(cameraCounts).map(([cId, info]) => ({
      cameraId: cId,
      buildingName: info.name,
      count: info.count,
      isSharedHardware: true, // Clearly notes that 4 logical cameras share 1 physical webcam
    }));

    const timeline = Object.entries(timelineMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({
        date,
        count,
      }));

    return NextResponse.json({
      data: {
        dataSource,
        timeframe,
        totalEvents,
        insufficientData: false,
        confirmedWasteCount,
        pendingReviewCount,
        falsePositiveCount,
        resolvedCount,
        categoryBreakdown,
        buildingComparison,
        cameraBreakdown,
        timeline,
        evidenceUploads: {
          uploadedCount,
          failedOrLocalCount,
          uploadSuccessRatePercent: Math.round((uploadedCount / totalEvents) * 100),
        },
        recentEvents: events.slice(0, 10),
      },
      error: null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to compile camera analytics';
    return NextResponse.json(
      { data: null, error: { code: 'ANALYTICS_FAILED', message } },
      { status: 500 }
    );
  }
}
