import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { registerSchema, apiResponse, apiError, calculateCogganZones } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        apiError(parsed.error.errors[0].message),
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    await connectDB();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        apiError('Email già registrata'),
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const defaultFTP = 200;

    const user = await User.create({
      email: email.toLowerCase(),
      name,
      passwordHash,
      profile: {
        ftp: defaultFTP,
        weight: 70,
        powerZones: calculateCogganZones(defaultFTP),
        heartRateZones: [
          { name: 'Z1 - Recovery', min: 0, max: 120 },
          { name: 'Z2 - Aerobic', min: 121, max: 140 },
          { name: 'Z3 - Tempo', min: 141, max: 160 },
          { name: 'Z4 - Threshold', min: 161, max: 175 },
          { name: 'Z5 - Max', min: 176, max: 220 },
        ],
      },
    });

    return NextResponse.json(
      apiResponse({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      apiError('Errore durante la registrazione'),
      { status: 500 }
    );
  }
}
