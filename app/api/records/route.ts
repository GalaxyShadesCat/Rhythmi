import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI not defined");
}

// Make sure we're using 'database' consistently
const DATABASE_NAME = "database";

// Clear any cached connections to ensure fresh connection with correct database
const connectMongoose = async () => {
  // Force Mongoose to use the correct database
  // First disconnect any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Connect with explicit database name
  console.log(`Connecting to MongoDB database: ${DATABASE_NAME} via Mongoose`);
  await mongoose.connect(MONGODB_URI, {
    dbName: DATABASE_NAME,
    bufferCommands: false,
  });

  return mongoose.connection;
};

// For direct MongoDB client connection (used in GET)
const getMongoClient = async () => {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log(
    `Connected to MongoDB database: ${DATABASE_NAME} via MongoClient`
  );
  return client;
};

// Define schema based on your RecordData interface
const RecordSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      get: (v: any) => String(v),
      set: (v: any) => String(v),
    },
    datetime: {
      type: String, // Store as string to match existing database records
      required: true,
    },
    ecg: [
      {
        timestamp: { type: Number, required: true },
        value: { type: Number, required: true },
      },
    ],
    hr: [
      {
        timestamp: { type: Number, required: true },
        value: { type: Number, required: true },
      },
    ],
    rest_metrics: {
      avgHeartRate: { type: Number, required: true },
      medianHeartRate: { type: Number, required: true },
      minHeartRate: { type: Number, required: true },
      maxHeartRate: { type: Number, required: true },
      heartRateVariability: { type: Number, required: true },
      rrIntervals: { type: [Number], required: true },
      rPeaks: { type: [Number], required: true },
      totalBeats: { type: Number, required: true },
      duration: { type: Number, required: true },
    },
    exercise_metrics: {
      avgHeartRate: { type: Number, required: true },
      medianHeartRate: { type: Number, required: true },
      minHeartRate: { type: Number, required: true },
      maxHeartRate: { type: Number, required: true },
      heartRateVariability: { type: Number, required: true },
      rrIntervals: { type: [Number], required: true },
      rPeaks: { type: [Number], required: true },
      totalBeats: { type: Number, required: true },
      duration: { type: Number, required: true },
    },
    recovery_metrics: {
      avgHeartRate: { type: Number, required: true },
      medianHeartRate: { type: Number, required: true },
      minHeartRate: { type: Number, required: true },
      maxHeartRate: { type: Number, required: true },
      heartRateVariability: { type: Number, required: true },
      rrIntervals: { type: [Number], required: true },
      rPeaks: { type: [Number], required: true },
      totalBeats: { type: Number, required: true },
      duration: { type: Number, required: true },
    },
    activity_segments: [
      {
        type: {
          type: String,
          enum: ["rest", "exercise", "recovery"],
          required: true,
        },
        start: { type: Number, required: true },
        end: { type: Number, required: true },
      },
    ],
    hrr_points: [
      {
        time: { type: Number, required: true },
        hr: { type: Number, required: false }, // Optional since it can be null
        hrr: { type: Number, required: false }, // Optional since it can be null
      },
    ],
    notes: { type: String, required: false }, // New optional field
  },
  {
    timestamps: false, // Don't add createdAt and updatedAt fields
    versionKey: false, // Don't add __v version key field
  }
);

// Force mongoose to use 'database.records'
RecordSchema.set("collection", "records");

// GET handler for fetching records
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("user_id");

  if (!user_id) {
    return NextResponse.json(
      { success: false, error: "user_id parameter is required" },
      { status: 400 }
    );
  }

  let client;
  try {
    client = await getMongoClient();
    const db = client.db(DATABASE_NAME);

    console.log(
      `Looking for records in ${DATABASE_NAME}.records for user: ${user_id}`
    );
    const recordsCollection = db.collection("records");

    // Ensure user_id is properly stringified
    const userId = String(user_id);

    // Query only records matching this specific user_id
    const records = await recordsCollection
      .find({
        user_id: userId,
      })
      .sort({ datetime: -1 })
      .toArray();

    console.log(`Found ${records.length} records for user ID: ${userId}`);

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    let errorMessage = "Failed to fetch records";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// POST handler for creating new records
export async function POST(request: Request) {
  try {
    // Parse the request body
    const recordData = await request.json();

    // Ensure datetime is a string
    if (recordData.datetime && recordData.datetime instanceof Date) {
      recordData.datetime = recordData.datetime.toISOString();
    }

    // Force a fresh connection to the correct database
    await connectMongoose();

    // Use the Mongoose model with the database name we want
    // const Record =
    //   mongoose.models.Record || mongoose.model("Record", RecordSchema);

    console.log(
      `Saving record to ${DATABASE_NAME}.records for user: ${recordData.user_id}`
    );
    console.log(
      "Record data sample:",
      JSON.stringify({
        user_id: recordData.user_id,
        datetime: recordData.datetime,
        ecg_points: recordData.ecg?.length || 0,
        hr_points: recordData.hr?.length || 0,
      })
    );

    // Skip Mongoose model and use direct MongoDB insertion to match exact format
    const connection = mongoose.connection;
    const collection = connection.collection("records");

    const result = await collection.insertOne(recordData);
    console.log(
      `Record saved successfully with ID: ${result.insertedId} to ${DATABASE_NAME}.records`
    );

    return NextResponse.json(
      {
        success: true,
        message: "Record saved successfully",
        data: {
          _id: result.insertedId,
          user_id: recordData.user_id,
          datetime: recordData.datetime,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving record:", error);

    let errorMessage = "Failed to save record";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  } finally {
    // Make sure we close the connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}
