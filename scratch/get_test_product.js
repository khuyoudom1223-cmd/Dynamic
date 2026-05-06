const { connectMongoDB, getDb } = require('../src/config/mongodb');
require('dotenv').config();

async function check() {
    try {
        await connectMongoDB();
        const db = getDb();
        const product = await db.collection('products').findOne({ status: 'Active', price: { $gt: 0 } });
        console.log("TEST_PRODUCT:", JSON.stringify(product, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
