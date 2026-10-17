import { NextRequest, NextResponse } from 'next/server';

const PYTHON_SERVICE_URL = process.env.CAMERA_SERVICE_URL || 'http://127.0.0.1:8000';

const VALID_CAMERAS = ['camera-1', 'camera-2', 'camera-3', 'camera-4'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { camera_id } = body;

    if (!camera_id || !VALID_CAMERAS.includes(camera_id)) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'INVALID_CAMERA_ID',
            message: `Invalid camera ID '${camera_id}'. Supported: ${VALID_CAMERAS.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    const res = await fetch(`${PYTHON_SERVICE_URL}/select-camera`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ camera_id }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Python service responded with status ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return NextResponse.json({ data, error: null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to select camera';
    return NextResponse.json(
      {
        data: null,
        error: { code: 'CAMERA_SELECTION_FAILED', message: msg },
      },
      { status: 500 }
    );
  }
}
