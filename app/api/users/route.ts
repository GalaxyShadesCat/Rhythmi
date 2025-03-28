import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(req: Request) {
  const body = await req.json();
  const { user_name, birth_year, gender } = body;

  if (!user_name || !birth_year || !gender) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = await getDb();
  const users = db.collection("users");

  const existingUser = await users.findOne({ user_name });
  if (existingUser) {
    return NextResponse.json(
      { error: "Username already exists" },
      { status: 409 }
    );
  }

  const result = await users.insertOne({ user_name, birth_year, gender });
  const newUser = await users.findOne({ _id: result.insertedId });

  return NextResponse.json(newUser, { status: 201 });
}
