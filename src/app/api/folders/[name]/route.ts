export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { updateFolder, deleteFolder } from '@/lib/notion';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: oldName } = await params;
    const body = await request.json();
    const { name: newName } = body;
    
    if (!newName || typeof newName !== 'string') {
      return NextResponse.json(
        { error: 'New folder name is required' },
        { status: 400 }
      );
    }
    
    const decodedOldName = decodeURIComponent(oldName);
    const folder = await updateFolder(decodedOldName, newName.trim());
    
    return NextResponse.json({ name: folder });
  } catch (error: any) {
    console.error('Error updating folder:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update folder' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    
    await deleteFolder(decodedName);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
