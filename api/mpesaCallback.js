export default async function handler(req, res) {
  try {
    // ✅ Safaricom sends POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body;

    console.log("📩 M-Pesa Callback:", JSON.stringify(body));

    const stkCallback = body?.Body?.stkCallback;

    if (!stkCallback) {
      return res.status(400).json({ error: "Invalid callback structure" });
    }

    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    // ✅ Payment Success
    if (resultCode === 0) {
      const metadata = stkCallback.CallbackMetadata?.Item || [];

      const getValue = (name) =>
        metadata.find((i) => i.Name === name)?.Value;

      const amount = getValue("Amount");
      const receipt = getValue("MpesaReceiptNumber");
      const phone = getValue("PhoneNumber");

      console.log("✅ Payment Successful");
      console.log("💰 Amount:", amount);
      console.log("🧾 Receipt:", receipt);
      console.log("📱 Phone:", phone);

      // 🔥 TODO: Save to database or mark order as paid

    } else {
      console.log("❌ Payment Failed:", resultDesc);
    }

    // ✅ MUST always return 200 to Safaricom
    return res.status(200).json({ message: "Callback received successfully" });

  } catch (error) {
    console.error("🚨 CALLBACK ERROR:", error);

    // ⚠️ Still return 200 to avoid retries flood
    return res.status(200).json({
      message: "Error handled",
    });
  }
}