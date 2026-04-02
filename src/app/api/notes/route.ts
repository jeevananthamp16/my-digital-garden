export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getNotes, createNote, searchNotes } from '@/lib/notion';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  try {
    if (query) {
      const notes = await searchNotes(query);
      return NextResponse.json(notes);
    }
    
    const notes = await getNotes();
    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const note = await createNote(body);
    
    if (!note) {
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
