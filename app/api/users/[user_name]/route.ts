import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

type Params = Promise<{ user_name: string }>;

export async function GET(req: NextRequest, context: { params: Params }) {
  const { user_name } = await context.params;

  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ user_name: user_name.toLowerCase() });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}
