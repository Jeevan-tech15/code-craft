import { NextResponse } from 'next/server';

const PYTHON_SERVICE_URL = process.env.CAMERA_SERVICE_URL || 'http://127.0.0.1:8000';

export async function GET() {
  try {
    const res = await fetch(`${PYTHON_SERVICE_URL}/status`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Python service status HTTP ${res.status}`);
    }
    const data = await res.json();
    return NextResponse.json({ data, error: null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Camera service unreachable';
    // Return honest offline state per specification
    return NextResponse.json({
      data: {
        active_camera_id: 'camera-1',
        is_monitoring: false,
        webcam_status: 'OFFLINE',
        physical_device_index: 0,
        session_id: 'offline',
        model_status: {
          model_name: 'EcoTwin Environmental Vision Net',
          model_version: '1.0.0',
          model_path: 'models/environmental_model.pt',
          is_available: false,
          status: 'MODEL UNAVAILABLE',
          error_reason: 'FastAPI camera service is currently offline or unreachable.',
          supported_classes: ['visible_litter', 'overflowing_bins', 'plastic_waste', 'paper_waste', 'food_waste'],
          confidence_threshold: 0.65,
          cooldown_seconds: 20,
        },
        cameras: {
          'camera-1': {
            id: 'camera-1',
            name: 'Camera 1 — Engineering Block',
            building_id: 'engineering',
            building_name: 'Engineering Block',
            zone: 'North Rooftop & Prototyping Lab',
            is_selected: true,
            status: 'OFFLINE',
            is_demo_mode: true,
            physical_device: 'Physical Webcam (Index 0)',
            last_frame_time: null,
            last_detection_time: null,
          },
          'camera-2': {
            id: 'camera-2',
            name: 'Camera 2 — Central Library',
            building_id: 'library',
            building_name: 'Central Library',
            zone: 'Basement Hydronic Loop & Restrooms',
            is_selected: false,
            status: 'INACTIVE IN DEMO MODE',
            is_demo_mode: true,
            physical_device: 'Physical Webcam (Index 0)',
            last_frame_time: null,
            last_detection_time: null,
          },
          'camera-3': {
            id: 'camera-3',
            name: 'Camera 3 — Advanced Science Laboratory',
            building_id: 'laboratory',
            building_name: 'Advanced Science Laboratory',
            zone: 'West Wet Lab & Cleanroom Sector',
            is_selected: false,
            status: 'INACTIVE IN DEMO MODE',
            is_demo_mode: true,
            physical_device: 'Physical Webcam (Index 0)',
            last_frame_time: null,
            last_detection_time: null,
          },
          'camera-4': {
            id: 'camera-4',
            name: 'Camera 4 — Campus Dining Commons',
            building_id: 'cafeteria',
            building_name: 'Campus Dining Commons',
            zone: 'South Kitchen & Bio-Digester Hub',
            is_selected: false,
            status: 'INACTIVE IN DEMO MODE',
            is_demo_mode: true,
            physical_device: 'Physical Webcam (Index 0)',
            last_frame_time: null,
            last_detection_time: null,
          },
        },
      },
      error: {
        code: 'CAMERA_SERVICE_OFFLINE',
        message: `FastAPI service at ${PYTHON_SERVICE_URL} is offline: ${msg}`,
      },
    });
  }
}
