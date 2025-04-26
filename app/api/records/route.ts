import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { RecordData } from "@/types/types";

export async function POST(req: Request) {
  const body = await req.json();

  // Destructure required fields from the RecordData object
  const {
    user_id,
    datetime,
    ecg,
    hr,
    rest_metrics,
    exercise_metrics,
    recovery_metrics,
    activity_segments,
    hrr_points,
  } = body as RecordData;

  // Validate required fields (do not check for _id or optional fields)
  if (
    !user_id ||
    !datetime ||
    !ecg ||
    !hr ||
    !rest_metrics ||
    !exercise_metrics ||
    !recovery_metrics ||
    !activity_segments
  ) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Additional validation: ensure arrays are not empty
  if (
    !Array.isArray(ecg) ||
    !Array.isArray(hr) ||
    !Array.isArray(activity_segments) ||
    ecg.length === 0 ||
    hr.length === 0 ||
    activity_segments.length === 0
  ) {
    return NextResponse.json(
      { error: "ECG/HR/activity_segments must be non-empty arrays" },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const records = db.collection("records");

    const result = await records.insertOne({
      user_id,
      datetime,
      ecg,
      hr,
      rest_metrics,
      exercise_metrics,
      recovery_metrics,
      activity_segments,
      hrr_points: hrr_points ?? [], // Optional
    });

    return NextResponse.json(
      { insertedId: result.insertedId },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Error inserting record" },
      { status: 500 }
    );
  }
}
