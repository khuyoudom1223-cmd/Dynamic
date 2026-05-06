/**
 * setupPayments.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Initialise the `payments` collection in MongoDB:
 *   - Creates collection (idempotent)
 *   - Creates indexes for order_id (unique), status, created_at, expired_at
 *   - Optionally creates a TTL index to auto-expire old documents
 *
 * Run once: node scripts/setupPayments.js
 * Or it is called automatically from startServer() in index.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

const { connectMongoDB, getDb, closeMongoDB } = require("../src/config/mongodb");
require("dotenv").config();

/**
 * Idempotent: safe to call on every startup.
 */
async function setupPaymentsCollection(db) {
  const col = db.collection("payments");

  // Unique index on order_id to prevent duplicate payments
  await col.createIndex({ order_id: 1 }, { unique: true, name: "idx_order_id_unique" });

  // Unique index on md5 so lookups remain fast and idempotent
  await col.createIndex({ md5: 1 }, { unique: true, sparse: true, name: "idx_md5_unique" });

  // Status index for filtering (pending/paid/failed/expired)
  await col.createIndex({ status: 1 }, { name: "idx_status" });

  // Date indexes for sorting & expiry queries
  await col.createIndex({ created_at: -1 }, { name: "idx_created_at" });
  await col.createIndex({ expired_at: 1 }, { name: "idx_expired_at" });

  // TTL index: MongoDB auto-deletes documents 7 days after created_at
  // Remove this if you want permanent payment records.
  // await col.createIndex({ created_at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7, name: "idx_ttl_7days" });

  console.log("[Migration] payments collection indexes ensured ✓");

  // ── Schema validation (MongoDB 3.6+) ──────────────────────────────────────
  try {
    await db.command({
      collMod: "payments",
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["order_id", "amount", "currency", "qr", "md5", "status", "expired_at"],
          properties: {
            order_id: { bsonType: "string", description: "Unique order reference" },
            amount: { bsonType: "double", description: "Payment amount" },
            currency: { enum: ["USD", "KHR"], description: "Currency code" },
            qr: { bsonType: "string", description: "EMV KHQR string" },
            md5: { bsonType: "string", description: "MD5 hash of the KHQR payload" },
            qr_image: { bsonType: "string", description: "Base64 QR image data-url" },
            transaction_id: { bsonType: ["string", "null"] },
            status: { enum: ["pending", "paid", "failed", "expired"] },
            source: { bsonType: "string" },
            merchant_id: { bsonType: "string" },
            merchant_name: { bsonType: "string" },
            expired_at: { bsonType: "date" },
            created_at: { bsonType: "date" },
            updated_at: { bsonType: "date" }
          }
        }
      },
      validationLevel: "moderate",
      validationAction: "warn"
    });
    console.log("[Migration] payments schema validation applied ✓");
  } catch {
    // collMod may fail on some MongoDB versions — that is fine
    console.log("[Migration] Schema validation skipped (older MongoDB version)");
  }

  return col;
}

async function setupPaymentLogsCollection(db) {
  const col = db.collection("payment_logs");
  await col.createIndex({ txn_id: 1 }, { name: "idx_txn_id" });
  await col.createIndex({ created_at: -1 }, { name: "idx_created_at" });
  console.log("[Migration] payment_logs collection indexes ensured ✓");
  return col;
}

// ── Standalone run ────────────────────────────────────────────────────────────
if (require.main === module) {
  (async () => {
    try {
      await connectMongoDB();
      const db = getDb();
      await setupPaymentsCollection(db);
      await setupPaymentLogsCollection(db);
      console.log("[Migration] Done.");
    } catch (err) {
      console.error("[Migration] Failed:", err.message);
      process.exit(1);
    } finally {
      await closeMongoDB();
    }
  })();
}

module.exports = { setupPaymentsCollection, setupPaymentLogsCollection };
