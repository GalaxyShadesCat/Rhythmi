import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

type Params = Promise<{ user_name: string }>;

// GET handler for fetching user data
export async function GET(req: NextRequest, context: { params: Params }) {
  const { user_name } = await context.params;
  console.log(`GET /api/users/${user_name} - Looking up user`);

  try {
    // Connect to DB
    const db = await getDb();
    console.log(`GET /api/users/${user_name} - Connected to database`);
    
    // Make sure we're looking up with lowercase username for consistency
    const sanitizedUserName = user_name.toLowerCase();
    console.log(`GET /api/users/${user_name} - Sanitized username: ${sanitizedUserName}`);
    
    const user = await db
      .collection("users")
      .findOne({ user_name: sanitizedUserName });
    
    console.log(`GET /api/users/${user_name} - Found user:`, !!user, user?._id ? `ID: ${user._id}` : 'No ID');

    if (!user) {
      console.log(`GET /api/users/${user_name} - User not found`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Return user data
    return NextResponse.json(user);
  } catch (error) {
    console.error(`GET /api/users/${user_name} - Error:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
