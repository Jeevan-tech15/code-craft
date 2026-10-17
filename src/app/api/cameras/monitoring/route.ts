import { NextRequest, NextResponse } from 'next/server';

const PYTHON_SERVICE_URL = process.env.CAMERA_SERVICE_URL || 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, camera_id } = body;

    if (action !== 'start' && action !== 'stop') {
      return NextResponse.json(
        {
          data: null,
          error: { code: 'INVALID_ACTION', message: 'Action must be "start" or "stop"' },
        },
        { status: 400 }
      );
    }

    const endpoint = action === 'start' ? '/start-monitoring' : '/stop-monitoring';
    const payload = action === 'start' && camera_id ? { camera_id } : undefined;

    const res = await fetch(`${PYTHON_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Python service responded with status ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return NextResponse.json({ data, error: null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Monitoring action failed';
    return NextResponse.json(
      {
        data: null,
        error: { code: 'MONITORING_ACTION_FAILED', message: msg },
      },
      { status: 500 }
    );
  }
}
