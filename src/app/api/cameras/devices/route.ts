import { NextResponse } from 'next/server';

const PYTHON_SERVICE_URL = process.env.CAMERA_SERVICE_URL || 'http://127.0.0.1:8000';

export async function GET() {
  try {
    const res = await fetch(`${PYTHON_SERVICE_URL}/devices`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Device discovery HTTP ${res.status}`);
    }
    const data = await res.json();
    return NextResponse.json({ data, error: null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discovery failed';
    return NextResponse.json({
      data: {
        devices: [
          {
            index: 0,
            name: 'Default Physical Device 0',
            resolution: '640x480',
            is_default: true,
            status: 'UNPROBED',
          },
        ],
        active_index: 0,
        count: 1,
      },
      error: { code: 'DISCOVERY_OFFLINE', message: msg },
    });
  }
}
