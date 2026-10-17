import { NextRequest, NextResponse } from 'next/server';

const PYTHON_SERVICE_URL = process.env.CAMERA_SERVICE_URL || 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { device_index = 0 } = body;

    const res = await fetch(`${PYTHON_SERVICE_URL}/test-camera`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_index: Number(device_index) }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Device test HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return NextResponse.json({ data, error: null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webcam test failed';
    return NextResponse.json(
      {
        data: null,
        error: { code: 'WEBCAM_TEST_FAILED', message: msg },
      },
      { status: 500 }
    );
  }
}
