const { connectMongoDB, getDb } = require('../src/config/mongodb');
require('dotenv').config();

async function check() {
    try {
        await connectMongoDB();
        const db = getDb();
        const log = await db.collection('payment_logs').findOne({ transaction_id: '5b6d05c60c740578a3fffce860931fc1' });
        console.log("PAYMENT_LOG:", JSON.stringify(log, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
