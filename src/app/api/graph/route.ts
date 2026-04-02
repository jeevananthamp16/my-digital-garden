export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getGraphData } from '@/lib/notion';

export async function GET() {
  try {
    const graphData = await getGraphData();
    return NextResponse.json(graphData);
  } catch (error) {
    console.error('Error fetching graph data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graph data' },
      { status: 500 }
    );
  }
}
