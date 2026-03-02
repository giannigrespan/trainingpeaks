import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseFitFile } from "@/lib/fit-parser";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ success: false, error: "Nessun file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // FIT header info
    const headerSize = buffer.length >= 1 ? buffer[0] : 0;
    const dataSize = buffer.length >= 8 ? buffer.readUInt32LE(4) : 0;
    const sig = buffer.length >= 12 ? buffer.toString("ascii", 8, 12) : "???";

    let parsed = null;
    let parseError = null;
    try {
      parsed = parseFitFile(buffer);
    } catch (e) {
      parseError = String(e);
    }

    return NextResponse.json({
      success: true,
      fileInfo: {
        size: buffer.length,
        headerSize,
        dataSize,
        signature: sig,
      },
      parseError,
      parsed: parsed
        ? {
            startTime: parsed.startTime,
            duration: parsed.duration,
            totalDistance: parsed.totalDistance,
            elevationGain: parsed.elevationGain,
            calories: parsed.calories,
            recordCount: parsed.timestamp.length,
            powerSamples: parsed.power.filter((p) => p > 0).length,
            hrSamples: parsed.heartRate.filter((h) => h > 0).length,
            cadenceSamples: parsed.cadence.filter((c) => c > 0).length,
            speedSamples: parsed.speed.filter((s) => s > 0).length,
            altitudeSamples: parsed.altitude.filter((a) => a > 0).length,
            firstPowerValues: parsed.power.slice(0, 10),
            firstTimestamps: parsed.timestamp.slice(0, 5),
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
