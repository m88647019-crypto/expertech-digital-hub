// ✅ Ensure shared memory exists (for sandbox testing)
if (!global.payments) {
  global.payments = {};
}

export default async function handler(req, res) {
  try {
    // ✅ Only allow POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    let { phone, amount } = req.body;

    // ✅ Validate input
    if (!phone || !amount) {
      return res.status(400).json({ error: "Phone and amount are required" });
    }

    // ✅ Normalize phone number (VERY IMPORTANT for M-Pesa)
    phone = phone.replace(/\s+/g, "");

    if (phone.startsWith("0")) {
      phone = "254" + phone.slice(1);
    } else if (phone.startsWith("+254")) {
      phone = phone.replace("+", "");
    }

    // Final validation
    if (!/^254\d{9}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid phone format. Use 07XXXXXXXX or 254XXXXXXXXX" });
    }

    // ✅ Ensure amount is valid
    amount = Number(amount);
    if (isNaN(amount) || amount < 1) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // ✅ Load env variables
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;

    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      console.error("❌ Missing env variables");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // ✅ Generate auth
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    // ✅ Get access token
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

    const accessToken = tokenData.access_token;

    // ✅ Generate timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")
      .slice(0, 14);

    // ✅ Generate password
    const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

    // ✅ Send STK Push
    const stkResponse = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: phone,
          PartyB: shortcode,
          PhoneNumber: phone,
          CallBackURL: "https://expertech.vercel.app/api/mpesaCallback",
          AccountReference: "ExpertechPrint",
          TransactionDesc: "Printing Payment",
        }),
      }
    );

    const result = await stkResponse.json();

    console.log("📲 STK Push result:", JSON.stringify(result));

    // ✅ SUCCESS RESPONSE
    if (result.ResponseCode === "0") {
      const checkoutRequestID =
        result.CheckoutRequestID || result.CheckoutRequestId;

      if (!checkoutRequestID) {
        return res.status(500).json({
          success: false,
          error: "Missing CheckoutRequestID",
        });
      }

      // Store as pending
      global.payments[checkoutRequestID] = {
        status: "pending",
        phone,
        amount,
        timestamp: Date.now(),
      };

      return res.status(200).json({
        success: true,
        checkoutRequestID,
        message: result.CustomerMessage || "STK Push sent",
      });
    }

    // ❌ FAILURE RESPONSE
    return res.status(200).json({
      success: false,
      error: result.errorMessage || "STK Push failed",
      details: result,
    });

  } catch (error) {
    console.error("🚨 STK PUSH ERROR:", error);

    return res.status(500).json({
      error: "STK Push failed",
      details: error.message,
    });
  }
}