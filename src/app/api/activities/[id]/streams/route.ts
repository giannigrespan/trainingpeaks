import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Activity from '@/models/Activity';
import ActivityStream from '@/models/ActivityStream';
import { apiResponse, apiError } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(apiError('Non autenticato'), { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as { id: string }).id;

    await connectDB();

    // Verify ownership
    const activity = await Activity.findOne({ _id: id, userId }).lean();
    if (!activity) {
      return NextResponse.json(apiError('Attività non trovata'), { status: 404 });
    }

    const streams = await ActivityStream.findOne({ activityId: id }).lean();
    if (!streams) {
      return NextResponse.json(apiError('Stream dati non trovati'), { status: 404 });
    }

    return NextResponse.json(apiResponse(streams));
  } catch (error) {
    console.error('Streams error:', error);
    return NextResponse.json(apiError('Errore nel recupero dati'), { status: 500 });
  }
}
