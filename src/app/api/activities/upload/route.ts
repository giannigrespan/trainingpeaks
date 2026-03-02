import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import {
  calculateNormalizedPower,
  calculateIntensityFactor,
  calculateTSS,
  calculatePowerCurve,
} from "@/lib/cycling-metrics";
import { parseFitFile } from "@/lib/fit-parser";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non autorizzato" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Nessun file fornito" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();

    let parsedData;
    if (fileName.endsWith(".fit")) {
      parsedData = parseFitFile(buffer);
    } else {
      return NextResponse.json(
        { success: false, error: "Formato file non supportato. Usa .fit" },
        { status: 400 }
      );
    }

    console.log(`[Upload] Parsed FIT: records=${parsedData.timestamp.length}, duration=${parsedData.duration}s, distance=${parsedData.totalDistance}m, power=${parsedData.power.filter((p: number) => p > 0).length} non-zero values`);

    const db = await getDb();
    const userId = (session.user as { id: string }).id;
    const user = await db.collection("users").findOne({ email: session.user.email });
    const ftp = user?.ftp || 200;

    const powerData = parsedData.power.filter((p: number) => p > 0);
    const np = calculateNormalizedPower(powerData);
    const intensityFactor = calculateIntensityFactor(np, ftp);
    const tss = calculateTSS(parsedData.duration, np, intensityFactor, ftp);
    const powerCurve = calculatePowerCurve(powerData);

    const activity = {
      userId,
      name: formData.get("name") || file.name.replace(/\.\w+$/, ""),
      activityDate: parsedData.startTime || new Date(),
      sport: "cycling",
      duration: parsedData.duration,
      distance: parsedData.totalDistance,
      elevationGain: parsedData.elevationGain,
      avgPower: Math.round(
        powerData.reduce((s: number, v: number) => s + v, 0) / (powerData.length || 1)
      ),
      maxPower: powerData.reduce((max: number, v: number) => v > max ? v : max, 0),
      normalizedPower: np,
      intensityFactor,
      tss,
      avgHR: Math.round(
        parsedData.heartRate.reduce((s: number, v: number) => s + v, 0) /
          parsedData.heartRate.length || 0
      ),
      maxHR: parsedData.heartRate.reduce((max: number, v: number) => v > max ? v : max, 0),
      avgCadence: Math.round(
        parsedData.cadence.reduce((s: number, v: number) => s + v, 0) /
          parsedData.cadence.length || 0
      ),
      avgSpeed:
        parsedData.totalDistance > 0 && parsedData.duration > 0
          ? parsedData.totalDistance / parsedData.duration
          : 0,
      maxSpeed: parsedData.speed.reduce((max: number, v: number) => v > max ? v : max, 0),
      calories: parsedData.calories || 0,
      powerCurve,
      createdAt: new Date(),
    };

    const activityResult = await db
      .collection("activities")
      .insertOne(activity);

    await db.collection("activity_streams").insertOne({
      activityId: activityResult.insertedId.toString(),
      timestamp: parsedData.timestamp,
      power: parsedData.power,
      heartRate: parsedData.heartRate,
      cadence: parsedData.cadence,
      speed: parsedData.speed,
      altitude: parsedData.altitude,
      distance: parsedData.distance,
      lat: parsedData.lat,
      lng: parsedData.lng,
    });

    return NextResponse.json({
      success: true,
      data: {
        activityId: activityResult.insertedId.toString(),
        ...activity,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Errore durante l'upload" },
      { status: 500 }
    );
  }
}
