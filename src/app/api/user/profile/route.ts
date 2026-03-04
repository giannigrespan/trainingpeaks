export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { generatePowerZones } from "@/lib/cycling-metrics";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non autorizzato" },
        { status: 401 }
      );
    }

    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne(
        { email: session.user.email },
        { projection: { password: 0 } }
      );

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Utente non trovato" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { success: false, error: "Errore nel caricamento profilo" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non autorizzato" },
        { status: 401 }
      );
    }

    const updates = await req.json();
    const db = await getDb();

    const allowedFields = ["name", "ftp", "weight", "powerZones", "hrZones"];
    const sanitized: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitized[key] = updates[key];
      }
    }

    // Auto-generate power zones if FTP changed and zones not provided
    if (sanitized.ftp && !sanitized.powerZones) {
      sanitized.powerZones = generatePowerZones(sanitized.ftp as number);
    }

    sanitized.updatedAt = new Date();

    await db
      .collection("users")
      .updateOne({ email: session.user.email }, { $set: sanitized });

    return NextResponse.json({ success: true, data: sanitized });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { success: false, error: "Errore nell'aggiornamento profilo" },
      { status: 500 }
    );
  }
}
