import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Activity from '@/models/Activity';
import { calculateFitnessTimeSeries } from '@/lib/calculations';
import { apiResponse, apiError } from '@/types';
import { subDays } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(apiError('Non autenticato'), { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '90');

    await connectDB();

    // Get all activities for this user (we need full history for accurate CTL/ATL)
    const activities = await Activity.find({ userId })
      .sort({ activityDate: 1 })
      .select('activityDate tss')
      .lean();

    if (activities.length === 0) {
      return NextResponse.json(apiResponse({ data: [], summary: { ctl: 0, atl: 0, tsb: 0 } }));
    }

    // Calculate fitness time series
    const dailyTSS = activities.map(a => ({
      date: new Date(a.activityDate),
      tss: a.tss,
    }));

    const fullTimeSeries = calculateFitnessTimeSeries(dailyTSS);

    // Filter to requested range
    const cutoff = subDays(new Date(), days);
    const filtered = fullTimeSeries.filter(d => d.date >= cutoff);

    // Current values
    const latest = fullTimeSeries[fullTimeSeries.length - 1];

    return NextResponse.json(apiResponse({
      data: filtered,
      summary: {
        ctl: latest?.ctl || 0,
        atl: latest?.atl || 0,
        tsb: latest?.tsb || 0,
      },
    }));
  } catch (error) {
    console.error('PMC error:', error);
    return NextResponse.json(apiError('Errore nel calcolo PMC'), { status: 500 });
  }
}
