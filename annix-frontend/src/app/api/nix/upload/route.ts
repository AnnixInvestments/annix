import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export async function POST(request: NextRequest) {
  console.log('[API Route] Nix upload starting, backend URL:', BACKEND_URL);

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    console.log('[API Route] Received file:', file ? (file as File).name : 'no file', 'Size:', file ? (file as File).size : 0);

    console.log('[API Route] Forwarding to backend:', `${BACKEND_URL}/nix/upload`);
    const response = await fetch(`${BACKEND_URL}/nix/upload`, {
      method: 'POST',
      body: formData,
    });

    console.log('[API Route] Backend response status:', response.status);
    const data = await response.json();
    console.log('[API Route] Backend response data:', JSON.stringify(data).substring(0, 200));

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Route] Nix upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[API Route] Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
