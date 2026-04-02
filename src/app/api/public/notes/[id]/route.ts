export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getPublicNote } from '@/lib/notion';

// GET - Fetch a single public note (read-only)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const note = await getPublicNote(id);
    
    if (!note) {
      return NextResponse.json(
        { error: 'Note not found or not public' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(note);
  } catch (error) {
    console.error('Error fetching public note:', error);
    return NextResponse.json(
      { error: 'Failed to fetch note' },
      { status: 500 }
    );
  }
}

// No PUT, PATCH, DELETE - public API is read-only
