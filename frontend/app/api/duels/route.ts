import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const limit = request.nextUrl.searchParams.get('limit') ?? '24';
    const res = await fetch(`${backendUrl}/api/duels?limit=${encodeURIComponent(limit)}`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Duel wall route error:', error);
    return NextResponse.json({ enabled: false, duels: [], record: null }, { status: 502 });
  }
}
