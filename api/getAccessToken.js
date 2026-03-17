export default async function handler(req, res) {
  try {
    // ✅ Allow only GET (since this is just fetching token)
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
      return res.status(500).json({ error: "Missing environment variables" });
    }

    // ✅ Encode credentials
    const auth = Buffer.from(
      `${consumerKey}:${consumerSecret}`
    ).toString("base64");

    // ✅ Request token
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

    // ✅ Handle failure from Safaricom
    if (!data.access_token) {
      return res.status(500).json({
        error: "Failed to fetch access token",
        details: data,
      });
    }

    return res.status(200).json({
      access_token: data.access_token,
      expires_in: data.expires_in,
    });

  } catch (error) {
    console.error("TOKEN ERROR:", error);

    return res.status(500).json({
      error: "Token request failed",
      details: error.message,
    });
  }
}