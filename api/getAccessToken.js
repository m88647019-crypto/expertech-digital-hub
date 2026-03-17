export default async function handler(req, res) {
  // 🔥 Prevent caching
  res.setHeader("Cache-Control", "no-store");

  try {
    // ✅ Allow only GET
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
      console.error("❌ Missing env variables");
      return res.status(500).json({ error: "Missing environment variables" });
    }

    // ✅ Encode credentials safely
    const auth = Buffer.from(
      `${consumerKey.trim()}:${consumerSecret.trim()}`
    ).toString("base64");

    console.log("🔐 Requesting M-Pesa access token...");

    const response = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const data = await response.json();

    console.log("📥 Token response:", data);

    // ❌ Handle API error
    if (!response.ok || !data.access_token) {
      return res.status(500).json({
        error: "Failed to fetch access token",
        status: response.status,
        details: data,
      });
    }

    // ✅ Success
    return res.status(200).json({
      success: true,
      access_token: data.access_token,
      expires_in: data.expires_in,
    });

  } catch (error) {
    console.error("🚨 TOKEN ERROR:", error);

    return res.status(500).json({
      error: "Token request failed",
      details: error.message,
    });
  }
}