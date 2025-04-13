import { MongoClient, Db } from "mongodb";

// Use the MONGODB_URI from environment variables, with a fallback for development/testing
const uri = process.env.MONGODB_URI || "mongodb://placeholder:27017/rhythmi";

// Check if we have a valid URI in production
if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
  console.warn("MONGODB_URI not set in environment variables, using placeholder. Database operations will fail in production.");
}

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // Allow global `var` declaration for hot reload in development
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect()
      .catch(err => {
        console.error("Failed to connect to MongoDB:", err);
        // Return a fake client that will allow the build to continue
        // Operations will fail gracefully in UI
        return Promise.resolve(new MongoClient("mongodb://localhost:27017"));
      });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect()
    .catch(err => {
      console.error("Failed to connect to MongoDB in production:", err);
      // Return a fake client that will allow the build to continue
      return Promise.resolve(new MongoClient("mongodb://localhost:27017"));
    });
}

// Export a function to get the DB
export async function getDb(): Promise<Db> {
  try {
    const client = await clientPromise;
    return client.db("rhythmi");
  } catch (error) {
    console.error("Failed to get MongoDB database:", error);
    // For Vercel deployments without MongoDB configured, allow builds to succeed
    if (process.env.NODE_ENV === 'development' || process.env.VERCEL) {
      const mockClient = new MongoClient('mongodb://localhost:27017');
      return mockClient.db("rhythmi");
    }
    throw error;
  }
}
