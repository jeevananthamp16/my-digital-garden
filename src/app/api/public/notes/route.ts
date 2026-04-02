export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getPublicNotes } from '@/lib/notion';

// GET - Fetch only public notes (no authentication required)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  try {
    const notes = await getPublicNotes(query || undefined);
    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching public notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

// No POST, PATCH, DELETE - public API is read-only
