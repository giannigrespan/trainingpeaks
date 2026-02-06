import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Activity from '@/models/Activity';
import { apiResponse, apiError } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(apiError('Non autenticato'), { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const sort = searchParams.get('sort') || 'activityDate';
    const order = searchParams.get('order') === 'asc' ? 1 : -1;

    await connectDB();

    // Build query
    const query: Record<string, unknown> = { userId };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (from || to) {
      query.activityDate = {};
      if (from) (query.activityDate as Record<string, unknown>).$gte = new Date(from);
      if (to) (query.activityDate as Record<string, unknown>).$lte = new Date(to);
    }

    const total = await Activity.countDocuments(query);
    const activities = await Activity.find(query)
      .sort({ [sort]: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json(
      apiResponse({
        activities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    console.error('Activities list error:', error);
    return NextResponse.json(apiError('Errore nel recupero attività'), { status: 500 });
  }
}
