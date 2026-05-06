const { connectMongoDB, getDb } = require('../src/config/mongodb');
require('dotenv').config();

async function check() {
    try {
        await connectMongoDB();
        const db = getDb();
        
        const log = await db.collection('payment_logs').findOne({ transaction_id: 'ce07bdc19976e86a3eb6e2341b4569a6' });
        console.log("PENDING_PAYMENT_LOG:", log.status);
        
        const order = await db.collection('orders').findOne({ transaction_id: 'ce07bdc19976e86a3eb6e2341b4569a6' });
        console.log("ORDER_EXISTS:", !!order);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
