// ✅ Ensure shared memory exists (for sandbox testing)
if (!global.payments) {
  global.payments = {};
}

export default async function handler(req, res) {
  // ✅ Prevent caching issues
  res.setHeader("Cache-Control", "no-store");

  try {
    // ✅ Only allow POST (Safaricom callback)
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body;

    console.log("📩 M-Pesa Callback:", JSON.stringify(body, null, 2));

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
      null;

    if (!checkoutRequestID) {
      console.warn("⚠️ Missing CheckoutRequestID");
      return res.status(200).json({ message: "Missing ID handled" });
    }

    // ✅ Extract metadata safely
    const metadata = stkCallback.CallbackMetadata?.Item || [];

    const getValue = (name) =>
      metadata.find((i) => i.Name === name)?.Value ?? null;

    const amount = getValue("Amount");
    const receipt = getValue("MpesaReceiptNumber");
    const phone = getValue("PhoneNumber");

    // ✅ SUCCESS CASE
    if (resultCode === 0) {
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
        resultCode,
        resultDesc,
        updatedAt: Date.now(),
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
        resultCode,
        updatedAt: Date.now(),
      };
    }

    console.log("🧠 Current Payments Store:", global.payments);

    // ✅ ALWAYS return 200 (VERY IMPORTANT for Safaricom)
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