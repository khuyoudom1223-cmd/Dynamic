
const { connectMongoDB, getDb, toObjectId } = require('../src/config/mongodb');
const bakongService = require('../src/services/BakongService');

async function testUpdate() {
  await connectMongoDB();
  const db = getDb();
  
  const txn_id = "TEST_TXN_" + Date.now();
  const orderId = "CAT-B7F81EB0"; // Existing order ID from my DB check
  
  console.log("Simulating success for txn_id:", txn_id, "and orderId:", orderId);
  
  // Mock the bakongService.checkTransaction
  const originalCheck = bakongService.checkTransaction;
  bakongService.checkTransaction = async () => ({
    status: "success",
    data: { data: { externalRef: orderId } }
  });
  
  try {
    // Manually call the logic that would be in the controller
    const result = await bakongService.checkTransaction(txn_id);
    
    if (result.status === "success") {
      const data = result.data.data || result.data;
      const returnedOrderId = data.externalRef || data.billNumber || data.terminalLabel;
      
      console.log("Found orderId in response:", returnedOrderId);
      
      const payment = await db.collection("payments").findOne({ 
        $or: [{ order_id: returnedOrderId }, { transaction_id: txn_id }] 
      });
      
      if (!payment) {
        console.log("Payment record not found for", returnedOrderId);
      } else {
        console.log("Payment record found. Internal Order ID:", payment.internal_order_id);
      }
      
      const updateData = {
        status: "paid",
        transaction_id: txn_id,
        paid_at: new Date(),
        updated_at: new Date()
      };
      
      const pUpdate = await db.collection("payments").updateOne(
        { order_id: returnedOrderId },
        { $set: updateData }
      );
      console.log("Payments update result:", pUpdate.modifiedCount);
      
      let orderFilter = null;
      if (payment && payment.internal_order_id) {
        orderFilter = { _id: toObjectId(payment.internal_order_id) };
      } else {
        const orderObjectId = toObjectId(returnedOrderId);
        if (orderObjectId) orderFilter = { _id: orderObjectId };
        else orderFilter = { order_id: returnedOrderId };
      }
      
      console.log("Order filter:", JSON.stringify(orderFilter));
      
      const oUpdate = await db.collection("orders").updateOne(
        orderFilter,
        { $set: { status: "paid", paid_at: new Date(), txn_id: txn_id } }
      );
      console.log("Orders update result:", oUpdate.modifiedCount);
    }
  } finally {
    bakongService.checkTransaction = originalCheck;
    process.exit(0);
  }
}

testUpdate();
