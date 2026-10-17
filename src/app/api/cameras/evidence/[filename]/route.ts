import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    // Sanitize filename to prevent path traversal
    const safeFilename = path.basename(filename);
    const evidencePath = path.join(process.cwd(), 'camera_service', 'evidence', safeFilename);

    if (!fs.existsSync(evidencePath)) {
      return new NextResponse('Evidence image not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(evidencePath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error reading evidence image';
    return new NextResponse(msg, { status: 500 });
  }
}
