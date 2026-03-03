import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { generatePowerZones } from "@/lib/cycling-metrics";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: "Tutti i campi sono obbligatori" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const existing = await db.collection("users").findOne({ email });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email già registrata" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const defaultFtp = 200;

    const result = await db.collection("users").insertOne({
      email,
      password: hashedPassword,
      name,
      ftp: defaultFtp,
      weight: 70,
      powerZones: generatePowerZones(defaultFtp),
      hrZones: {
        z1: { min: 0, max: 120 },
        z2: { min: 120, max: 140 },
        z3: { min: 140, max: 160 },
        z4: { min: 160, max: 175 },
        z5: { min: 175, max: 200 },
      },
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      subscriptionStatus: "trialing",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: { userId: result.insertedId.toString() },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Errore durante la registrazione" },
      { status: 500 }
    );
  }
}
