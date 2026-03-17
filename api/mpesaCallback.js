// ✅ Ensure shared memory exists (for sandbox testing)
if (!global.payments) {
  global.payments = {};
}

export default async function handler(req, res) {
  try {
    // ✅ Only allow POST (Safaricom callback)
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body;

    console.log("📩 M-Pesa Callback:", JSON.stringify(body));

    const stkCallback = body?.Body?.stkCallback;

    // ✅ Validate structure
    if (!stkCallback) {
      console.warn("⚠️ Invalid callback structure");
      return res.status(200).json({ message: "Invalid structure handled" });
    }

    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    // ✅ SAFER CheckoutRequestID extraction
    const checkoutRequestID =
      stkCallback.CheckoutRequestID ||
      stkCallback.CheckoutRequestId ||
      "unknown_" + Date.now();

    // ✅ SUCCESS CASE
    if (resultCode === 0) {
      const metadata = stkCallback.CallbackMetadata?.Item || [];

      const getValue = (name) =>
        metadata.find((i) => i.Name === name)?.Value ?? null;

      const amount = getValue("Amount");
      const receipt = getValue("MpesaReceiptNumber");
      const phone = getValue("PhoneNumber");

      console.log("✅ Payment Successful:", {
        checkoutRequestID,
        amount,
        receipt,
        phone,
      });

      global.payments[checkoutRequestID] = {
        status: "success",
        amount,
        receipt,
        phone,
        timestamp: Date.now(),
      };

    } else {
      // ❌ FAILURE CASE
      console.log("❌ Payment Failed:", {
        checkoutRequestID,
        resultDesc,
      });

      global.payments[checkoutRequestID] = {
        status: "failed",
        reason: resultDesc,
        timestamp: Date.now(),
      };
    }

    // ✅ ALWAYS return 200 to prevent retries
    return res.status(200).json({
      message: "Callback processed successfully",
    });

  } catch (error) {
    console.error("🚨 CALLBACK ERROR:", error);

    // ⚠️ STILL return 200 (critical for Safaricom)
    return res.status(200).json({
      message: "Error handled safely",
    });
  }
}