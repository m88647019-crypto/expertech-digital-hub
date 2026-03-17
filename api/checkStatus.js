// ✅ Payment status checker — queries Safaricom STK Query API directly
// This avoids the unreliable global.payments approach on Vercel serverless

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Missing checkoutRequestID" });
    }

    console.log("🔎 Querying Safaricom for:", id);

    // ✅ Load env variables
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;

    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      console.error("❌ Missing env variables");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // ✅ Get access token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenResponse = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        method: "GET",
        headers: { Authorization: `Basic ${auth}` },
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error("❌ Token error:", tokenData);
      return res.status(500).json({ error: "Failed to get access token" });
    }

    // ✅ Generate timestamp & password
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")
      .slice(0, 14);
    const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

    // ✅ Query STK Push status from Safaricom
    const queryResponse = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: id,
        }),
      }
    );

    const queryResult = await queryResponse.json();
    console.log("📋 STK Query result:", JSON.stringify(queryResult));

    // ✅ Parse Safaricom response
    const resultCode = queryResult.ResultCode;

    if (resultCode === undefined || resultCode === null) {
      // Query itself failed or transaction still processing
      return res.status(200).json({ status: "pending" });
    }

    if (String(resultCode) === "0") {
      return res.status(200).json({
        status: "success",
        receipt: queryResult.MpesaReceiptNumber || null,
        amount: queryResult.Amount || null,
      });
    }

    // ResultCode 1032 = cancelled by user, others = various failures
    if (String(resultCode) === "1032") {
      return res.status(200).json({
        status: "failed",
        reason: "Transaction cancelled by user",
      });
    }

    // Any other non-zero result code = failed
    return res.status(200).json({
      status: "failed",
      reason: queryResult.ResultDesc || "Payment failed",
    });

  } catch (error) {
    console.error("🚨 CHECK STATUS ERROR:", error);
    return res.status(500).json({ error: "Status check failed" });
  }
}
