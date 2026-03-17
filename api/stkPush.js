if (!global.payments) {
  global.payments = {};
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { phone, amount } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ error: "Phone and amount are required" });
    }

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;

    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      return res.status(500).json({ error: "Missing environment variables" });
    }

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
      return res.status(500).json({ error: "Failed to get access token", tokenData });
    }

    const accessToken = tokenData.access_token;

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")
      .slice(0, 14);

    const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

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
          Amount: Number(amount),
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
    console.log("STK Push result:", JSON.stringify(result));

    if (result.ResponseCode === "0") {
      const checkoutRequestID = result.CheckoutRequestID;
      global.payments[checkoutRequestID] = { status: "pending" };

      return res.status(200).json({
        success: true,
        checkoutRequestID,
        CustomerMessage: result.CustomerMessage,
      });
    }

    return res.status(200).json({
      success: false,
      error: result.errorMessage || "STK Push failed",
      details: result,
    });
  } catch (error) {
    console.error("STK PUSH ERROR:", error);
    return res.status(500).json({
      error: "STK Push failed",
      details: error.message,
    });
  }
}
