import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Activity from '@/models/Activity';
import { apiResponse, apiError } from '@/types';
import { startOfWeek, endOfWeek } from 'date-fns';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(apiError('Non autenticato'), { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    await connectDB();

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Weekly stats
    const weeklyActivities = await Activity.find({
      userId,
      activityDate: { $gte: weekStart, $lte: weekEnd },
    }).lean();

    const weeklyTSS = weeklyActivities.reduce((sum, a) => sum + a.tss, 0);
    const weeklyHours = weeklyActivities.reduce((sum, a) => sum + a.duration, 0) / 3600;
    const weeklyKm = weeklyActivities.reduce((sum, a) => sum + a.distance, 0);
    const weeklyCount = weeklyActivities.length;

    // All-time stats
    const totalActivities = await Activity.countDocuments({ userId });

    // Recent 5 activities
    const recentActivities = await Activity.find({ userId })
      .sort({ activityDate: -1 })
      .limit(5)
      .lean();

    return NextResponse.json(apiResponse({
      weekly: {
        tss: Math.round(weeklyTSS),
        hours: Math.round(weeklyHours * 10) / 10,
        km: Math.round(weeklyKm),
        count: weeklyCount,
      },
      totalActivities,
      recentActivities,
    }));
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(apiError('Errore nel recupero statistiche'), { status: 500 });
  }
}
