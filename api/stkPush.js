export default async function handler(req, res) {
  try {
    // ✅ Only allow POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ✅ Get data from request body
    const { phone, amount } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ error: "Phone and amount are required" });
    }

    // ✅ Environment variables
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;

    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      return res.status(500).json({ error: "Missing environment variables" });
    }

    // ✅ Generate auth
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    // ✅ Get access token
    const tokenResponse = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return res.status(500).json({ error: "Failed to get access token", tokenData });
    }

    const accessToken = tokenData.access_token;

    // ✅ Generate timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")
      .slice(0, 14);

    // ✅ Generate password
    const password = Buffer.from(
      shortcode + passkey + timestamp
    ).toString("base64");

    // ✅ STK Push request
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

          // 🔥 IMPORTANT: Updated callback for Vercel
          CallBackURL:
            "https://expertech.vercel.app/api/mpesaCallback",

          AccountReference: "ExpertechPrint",
          TransactionDesc: "Printing Payment",
        }),
      }
    );

    const result = await stkResponse.json();

    return res.status(200).json(result);

  } catch (error) {
    console.error("STK PUSH ERROR:", error);

    return res.status(500).json({
      error: "STK Push failed",
      details: error.message,
    });
  }
}