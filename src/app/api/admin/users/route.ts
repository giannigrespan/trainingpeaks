export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const db = await getDb();
  const users = await db
    .collection("users")
    .find(
      {},
      {
        projection: {
          password: 0,
          powerZones: 0,
          hrZones: 0,
        },
      }
    )
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json(
    users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role ?? "user",
      subscriptionStatus: u.subscriptionStatus ?? "none",
      trialEndsAt: u.trialEndsAt ?? null,
      stripeCustomerId: u.stripeCustomerId ?? null,
      stripeSubscriptionId: u.stripeSubscriptionId ?? null,
      subscriptionCurrentPeriodEnd: u.subscriptionCurrentPeriodEnd ?? null,
      createdAt: u.createdAt ?? null,
    }))
  );
}
