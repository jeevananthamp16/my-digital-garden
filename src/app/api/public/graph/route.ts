import { NextResponse } from 'next/server';
import { getPublicGraphData } from '@/lib/notion';

// GET /api/public/graph - Get graph data for public notes only
export async function GET() {
  try {
    const graphData = await getPublicGraphData();
    return NextResponse.json(graphData);
  } catch (error) {
    console.error('Error fetching public graph data:', error);
    return NextResponse.json({ error: 'Failed to fetch graph data' }, { status: 500 });
  }
}
