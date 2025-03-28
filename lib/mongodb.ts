import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI!;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // Allow global `var` declaration for hot reload in development
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!process.env.MONGODB_URI) {
  throw new Error("Please add MONGODB_URI to your environment variables");
}

if (process.env.NODE_ENV === "development") {
  // In development, use a global variable so we don't create a new client on every reload
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, it's fine to instantiate a new client
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a function to get the DB
export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db("database");
}
