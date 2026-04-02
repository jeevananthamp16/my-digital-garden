export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getFolders, createFolder } from '@/lib/notion';

export async function GET() {
  try {
    const folders = await getFolders();
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }
    
    const folder = await createFolder(name.trim());
    return NextResponse.json({ name: folder }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create folder' },
      { status: 500 }
    );
  }
}
