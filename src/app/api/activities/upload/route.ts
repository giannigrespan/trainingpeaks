import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { importFitBuffer } from "@/lib/activity-importer";

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

    if (!file.name.toLowerCase().endsWith(".fit")) {
      return NextResponse.json(
        { success: false, error: "Formato file non supportato. Usa .fit" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const userId = (session.user as { id: string }).id;
    const name = (formData.get("name") as string) || file.name.replace(/\.\w+$/, "");

    const result = await importFitBuffer(buffer, { userId, name });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Errore durante l'upload" },
      { status: 500 }
    );
  }
}
