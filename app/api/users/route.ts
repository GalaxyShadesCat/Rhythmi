import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

// POST handler for creating new users
export async function POST(request: Request) {
  // Parse the request body
  const body = await request.json();
  const { user_name, birth_year, gender } = body;

  // Check if all fields are filled in
  if (!user_name || !birth_year || !gender) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Connect to DB
  const db = await getDb();
  const users = db.collection("users");

  // Check if user exists
  const existingUser = await users.findOne({ user_name });
  if (existingUser) {
    return NextResponse.json(
      { error: "Username already exists" },
      { status: 409 }
    );
  }

  // Create new user entry
  const result = await users.insertOne({ user_name, birth_year, gender });
  const newUser = await users.findOne({ _id: result.insertedId });

  // Return newly created user data as JSON
  return NextResponse.json(newUser, { status: 201 });
}
