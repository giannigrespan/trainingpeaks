import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { profileSchema, apiResponse, apiError, calculateCogganZones } from '@/types';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(apiError('Non autenticato'), { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    await connectDB();

    const user = await User.findById(userId).select('-passwordHash').lean();
    if (!user) {
      return NextResponse.json(apiError('Utente non trovato'), { status: 404 });
    }

    return NextResponse.json(apiResponse(user));
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json(apiError('Errore nel recupero profilo'), { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(apiError('Non autenticato'), { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        apiError(parsed.error.errors[0].message),
        { status: 400 }
      );
    }

    await connectDB();

    const updateData: Record<string, unknown> = {
      'profile.ftp': parsed.data.ftp,
      'profile.weight': parsed.data.weight,
    };

    // Auto-calculate power zones from FTP if not provided
    if (parsed.data.powerZones) {
      updateData['profile.powerZones'] = parsed.data.powerZones;
    } else {
      updateData['profile.powerZones'] = calculateCogganZones(parsed.data.ftp);
    }

    if (parsed.data.heartRateZones) {
      updateData['profile.heartRateZones'] = parsed.data.heartRateZones;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-passwordHash').lean();

    if (!user) {
      return NextResponse.json(apiError('Utente non trovato'), { status: 404 });
    }

    return NextResponse.json(apiResponse(user));
  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json(apiError('Errore nell\'aggiornamento profilo'), { status: 500 });
  }
}
