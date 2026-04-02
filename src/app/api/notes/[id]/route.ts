export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getNote, updateNote, deleteNote } from '@/lib/notion';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  const { id } = await params;
  
  try {
    const note = await getNote(id);
    
    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json(
      { error: 'Failed to fetch note' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteParams
) {
  const { id } = await params;
  
  try {
    const body = await request.json();
    const note = await updateNote(id, body);
    
    if (!note) {
      return NextResponse.json(
        { error: 'Failed to update note' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(note);
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  const { id } = await params;
  
  try {
    const success = await deleteNote(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete note' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
