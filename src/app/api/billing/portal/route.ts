export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });

    if (!user?.paypalSubscriptionId) {
      return NextResponse.json(
        { error: "Nessun abbonamento trovato" },
        { status: 400 }
      );
    }

    // PayPal manage subscriptions page
    const url = "https://www.paypal.com/myaccount/autopay/";
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Billing portal error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
