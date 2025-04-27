import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI not defined');
}

let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

// Database connection setup
async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Define schema based on your RecordData interface
const RecordSchema = new mongoose.Schema({
  user_id: { 
    type: String, 
    required: true,
    // Convert to string to ensure consistent comparison
    get: (v: any) => String(v),
    set: (v: any) => String(v) 
  },
  datetime: { type: Date, required: true },
  ecg: [{
    timestamp: { type: Number, required: true },
    value: { type: Number, required: true }
  }],
  hr: [{
    timestamp: { type: Number, required: true },
    value: { type: Number, required: true }
  }],
  rest_metrics: {
    avgHeartRate: Number,
    medianHeartRate: Number,
    minHeartRate: Number,
    maxHeartRate: Number,
    heartRateVariability: Number,
    rrIntervals: [Number],
    rPeaks: [Number],
    totalBeats: Number,
    duration: Number
  },
  exercise_metrics: {
    avgHeartRate: Number,
    medianHeartRate: Number,
    minHeartRate: Number,
    maxHeartRate: Number,
    heartRateVariability: Number,
    rrIntervals: [Number],
    rPeaks: [Number],
    totalBeats: Number,
    duration: Number
  },
  recovery_metrics: {
    avgHeartRate: Number,
    medianHeartRate: Number,
    minHeartRate: Number,
    maxHeartRate: Number,
    heartRateVariability: Number,
    rrIntervals: [Number],
    rPeaks: [Number],
    totalBeats: Number,
    duration: Number
  },
  activity_segments: [{
    type: { type: String, enum: ["rest", "exercise", "recovery"], required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true }
  }],
  hrr_points: [{
    time: Number,
    hr: Number,
    hrr: Number
  }]
}, {
  timestamps: true
});

const Record = mongoose.models.Record || mongoose.model('Record', RecordSchema);

// GET handler for fetching records
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get('user_id');

  if (!user_id) {
    return NextResponse.json(
      { success: false, error: 'user_id parameter is required' },
      { status: 400 }
    );
  }

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db('database');
    const recordsCollection = db.collection('records');

    // Ensure user_id is properly stringified
    const userId = String(user_id);
    
    // Query only records matching this specific user_id
    const records = await recordsCollection.find({
      user_id: userId
    }).sort({ datetime: -1 }).toArray();
    
    await client.close();
    return NextResponse.json({ success: true, data: records });
    
  } catch (error) {
    let errorMessage = 'Failed to fetch records';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}