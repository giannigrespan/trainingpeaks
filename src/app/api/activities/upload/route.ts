import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Activity from '@/models/Activity';
import ActivityStream from '@/models/ActivityStream';
import User from '@/models/User';
import { parseFitFile } from '@/lib/parsers/fit-parser';
import { calculateAllMetrics } from '@/lib/calculations';
import { apiResponse, apiError } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(apiError('Non autenticato'), { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(apiError('Nessun file caricato'), { status: 400 });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.fit') && !fileName.endsWith('.gpx') && !fileName.endsWith('.tcx')) {
      return NextResponse.json(
        apiError('Formato file non supportato. Usa .fit, .gpx o .tcx'),
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        apiError('File troppo grande. Max 50MB'),
        { status: 400 }
      );
    }

    await connectDB();

    const userId = (session.user as { id: string }).id;
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(apiError('Utente non trovato'), { status: 404 });
    }

    const ftp = user.profile?.ftp || 200;

    // Parse file
    const buffer = Buffer.from(await file.arrayBuffer());
    let parsed;

    if (fileName.endsWith('.fit')) {
      parsed = await parseFitFile(buffer);
    } else {
      // GPX/TCX parsing - for now focus on FIT
      return NextResponse.json(
        apiError('Supporto GPX/TCX in arrivo. Usa file .fit per ora.'),
        { status: 400 }
      );
    }

    // Calculate metrics
    const metrics = calculateAllMetrics(
      parsed.streams.power,
      ftp,
      parsed.duration
    );

    const maxPower = Math.max(...parsed.streams.power, 0);
    const avgHeartRate = parsed.streams.heartRate.filter(h => h > 0).length > 0
      ? Math.round(parsed.streams.heartRate.filter(h => h > 0).reduce((s, h) => s + h, 0) /
        parsed.streams.heartRate.filter(h => h > 0).length)
      : 0;
    const maxHeartRate = Math.max(...parsed.streams.heartRate, 0);
    const avgCadence = parsed.streams.cadence.filter(c => c > 0).length > 0
      ? Math.round(parsed.streams.cadence.filter(c => c > 0).reduce((s, c) => s + c, 0) /
        parsed.streams.cadence.filter(c => c > 0).length)
      : 0;
    const avgSpeed = parsed.duration > 0
      ? Math.round((parsed.distance / (parsed.duration / 3600)) * 10) / 10
      : 0;

    // Save activity
    const activity = await Activity.create({
      userId,
      name: parsed.name,
      activityDate: parsed.activityDate,
      duration: parsed.duration,
      distance: parsed.distance,
      avgPower: metrics.avgPower,
      maxPower,
      normalizedPower: metrics.normalizedPower,
      intensityFactor: metrics.intensityFactor,
      tss: metrics.tss,
      variabilityIndex: metrics.variabilityIndex,
      avgHeartRate,
      maxHeartRate,
      avgCadence,
      avgSpeed,
      elevationGain: parsed.elevationGain,
      powerCurve: metrics.powerCurve,
      zoneDistribution: metrics.zoneDistribution,
      fileUrl: '', // Will use Vercel Blob in production
      hasGps: parsed.streams.latitude.length > 0,
    });

    // Save streams
    await ActivityStream.create({
      activityId: activity._id,
      ...parsed.streams,
    });

    return NextResponse.json(
      apiResponse({
        activityId: activity._id.toString(),
        name: activity.name,
        tss: activity.tss,
        normalizedPower: activity.normalizedPower,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      apiError('Errore durante il caricamento del file'),
      { status: 500 }
    );
  }
}
