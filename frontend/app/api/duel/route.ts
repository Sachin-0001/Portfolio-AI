import { NextRequest, NextResponse } from 'next/server';

// Judging can take a while on a cold backend; streaming keeps the connection alive meanwhile.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const form = await request.formData();

    const upstream = await fetch(`${backendUrl}/api/duel`, {
      method: 'POST',
      body: form,
      headers: {
        // Lets the backend rate-limit per visitor rather than per proxy
        'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
      },
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      let detail = 'The arena is unavailable right now. Please try again shortly.';
      try {
        detail = JSON.parse(text).detail ?? detail;
      } catch {}
      return NextResponse.json({ error: detail }, { status: upstream.status || 502 });
    }

    // Pass the NDJSON progress stream straight through
    return new Response(upstream.body, {
      headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Duel route error:', error);
    return NextResponse.json({ error: 'Could not reach the arena. Please try again.' }, { status: 502 });
  }
}
