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
    const activity = await Activity.findOne({ _id: id, userId }).lean();

    if (!activity) {
      return NextResponse.json(apiError('Attività non trovata'), { status: 404 });
    }

    return NextResponse.json(apiResponse(activity));
  } catch (error) {
    console.error('Activity detail error:', error);
    return NextResponse.json(apiError('Errore nel recupero attività'), { status: 500 });
  }
}

export async function PUT(
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
    const { name } = await req.json();

    await connectDB();
    const activity = await Activity.findOneAndUpdate(
      { _id: id, userId },
      { name },
      { new: true }
    ).lean();

    if (!activity) {
      return NextResponse.json(apiError('Attività non trovata'), { status: 404 });
    }

    return NextResponse.json(apiResponse(activity));
  } catch (error) {
    console.error('Activity update error:', error);
    return NextResponse.json(apiError('Errore nell\'aggiornamento'), { status: 500 });
  }
}

export async function DELETE(
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
    const activity = await Activity.findOneAndDelete({ _id: id, userId });

    if (!activity) {
      return NextResponse.json(apiError('Attività non trovata'), { status: 404 });
    }

    // Delete associated streams
    await ActivityStream.deleteOne({ activityId: id });

    return NextResponse.json(apiResponse({ deleted: true }));
  } catch (error) {
    console.error('Activity delete error:', error);
    return NextResponse.json(apiError('Errore nell\'eliminazione'), { status: 500 });
  }
}
