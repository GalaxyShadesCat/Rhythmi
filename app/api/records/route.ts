import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(req: Request) {
  const body = await req.json();
  const { user_id, datetime, ecg, hr, activity_segments } = body;

  if (!user_id || !datetime || !ecg || !hr || !activity_segments) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = await getDb();
  const records = db.collection("records");

  const result = await records.insertOne({
    user_id,
    datetime,
    ecg,
    hr,
    activity_segments,
  });

  return NextResponse.json({ insertedId: result.insertedId }, { status: 201 });
}
