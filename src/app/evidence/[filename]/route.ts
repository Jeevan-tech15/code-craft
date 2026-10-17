import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    const localPath = path.resolve(process.cwd(), 'camera_service/evidence', safeFilename);

    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // If not found locally, redirect to Supabase storage public URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      // Try camera-1 as default subpath if needed
      return NextResponse.redirect(
        `${supabaseUrl}/storage/v1/object/public/camera-evidence/camera-1/${safeFilename}`
      );
    }

    return new NextResponse('Evidence image not found', { status: 404 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error reading evidence image';
    return new NextResponse(message, { status: 500 });
  }
}
