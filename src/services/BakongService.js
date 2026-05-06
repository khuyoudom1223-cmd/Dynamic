const axios = require("axios");
const { BakongKHQR, khqrData, IndividualInfo } = require("bakong-khqr");

/**
 * BakongService — matches the demo-integration-api-bakong-khqr-main approach.
 *
 * QR generation: uses the `bakong-khqr` npm package locally (no API call).
 * Payment check: calls POST /check_transaction_by_md5 on the Bakong API.
 */
class BakongService {
  constructor() {
    const isProduction = process.env.NODE_ENV === "production";
    this.baseUrl = isProduction
      ? process.env.BAKONG_PROD_BASE_API_URL
      : (process.env.BAKONG_DEV_BASE_API_URL || "https://sit-api-bakong.nbc.gov.kh/v1");

    this.token = process.env.BAKONG_ACCESS_TOKEN || process.env.BAKONG_TOKEN;
    this.merchantId = process.env.BAKONG_MERCHANT_ID || "soklin_chen@bkrt";
    this.merchantName = process.env.BAKONG_MERCHANT_NAME || "SOKLIN CHEN";

    console.log(`🚀 BakongService initialized with URL: ${this.baseUrl} (NODE_ENV: ${process.env.NODE_ENV})`);
  }

  /**
   * Generate a KHQR code locally using the bakong-khqr package.
   * Returns { success, qr, md5, expiresAt } on success.
   *
   * @param {number|string} amount   Amount to charge
   * @param {string}        currency "USD" or "KHR"
   * @param {string}        orderId  Bill / order reference number
   */
  async generateKHQR(amount, currency = "USD", orderId = "ORDER_00001") {
    try {
      const expirationTimestamp = Date.now() + 5 * 60 * 1000; // 5 min

      const optionalData = {
        currency: currency === "KHR" ? khqrData.currency.khr : khqrData.currency.usd,
        amount: parseFloat(amount),
        billNumber: orderId,
        storeLabel: this.merchantName,
        terminalLabel: "Online Payment",
        expirationTimestamp,
      };

      const individualInfo = new IndividualInfo(
        this.merchantId,
        this.merchantName,
        "Phnom Penh",
        optionalData
      );

      const khqr = new BakongKHQR();
      const qrData = khqr.generateIndividual(individualInfo);

      if (!qrData || !qrData.data) {
        throw new Error(`Invalid QR response: ${JSON.stringify(qrData)}`);
      }

      return {
        success: true,
        qr: qrData.data.qr,
        md5: qrData.data.md5,
        expiresAt: expirationTimestamp,
      };
    } catch (error) {
      console.error("❌ BakongService.generateKHQR error:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Check payment status via Bakong API using the QR's MD5 hash.
   * Returns { paid, hash, amount, from, to, timestamp } on success,
   * or { paid: false, ... } when pending / failed.
   *
   * @param {string} md5  The MD5 from generateKHQR()
   */
  async checkPayment(md5) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/check_transaction_by_md5`,
        { md5 },
        { headers: { Authorization: `Bearer ${this.token}` } }
      );

      const data = response.data;

      // responseCode 0 (number) = transaction found; toAccountId present = paid
      if (data.responseCode === 0 && data.data?.hash) {
        const isPaid = !!data.data.toAccountId;
        return {
          paid: isPaid,
          hash: data.data.hash,
          amount: data.data.amount,
          from: data.data.fromAccountId,
          to: isPaid ? data.data.toAccountId : "unknown",
          timestamp: new Date(data.data.createdDateMs).toLocaleString(),
          raw: data.data,
        };
      }

      // responseCode 1 = transaction not found yet (pending)
      return {
        paid: false,
        hash: md5,
        amount: 0,
        from: "unknown",
        to: "unknown",
        timestamp: new Date().toLocaleString(),
      };
    } catch (error) {
      console.error("❌ BakongService.checkPayment error:", error.response?.data || error.message);
      return {
        paid: false,
        hash: md5,
        amount: 0,
        from: "unknown",
        to: "unknown",
        timestamp: new Date().toLocaleString(),
      };
    }
  }
}

module.exports = new BakongService();
