const { MongoClient, ObjectId } = require("mongodb");

// Check for MONGODB_URI, or any custom prefix you might have used in Vercel (e.g., MONGODB_URL, NEW_MONGODB_URI)
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.NEW_MONGODB_URI || process.env.STORAGE_MONGODB_URI || "mongodb://localhost:27017/?directConnection=true";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "dynamics_node";
const MONGODB_SERVER_SELECTION_TIMEOUT_MS = Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000);

let client;
let db;

async function connectMongoDB() {
  if (db) {
    return db;
  }

  client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: MONGODB_SERVER_SELECTION_TIMEOUT_MS
  });
  await client.connect();
  db = client.db(MONGODB_DB_NAME);

  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("categories").createIndex({ name: 1 }, { unique: true }),
    db.collection("products").createIndex({ category_id: 1 }),
    db.collection("orders").createIndex({ user_id: 1 })
  ]);

  return db;
}

function getDb() {
  if (!db) {
    throw new Error("MongoDB is not connected");
  }
  return db;
}

function toObjectId(id) {
  if (!id || !ObjectId.isValid(id)) {
    return null;
  }
  return new ObjectId(id);
}

async function closeMongoDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = {
  connectMongoDB,
  getDb,
  toObjectId,
  closeMongoDB
};
