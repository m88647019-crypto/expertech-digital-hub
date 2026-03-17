if (!global.payments) {
  global.payments = {};
}

export default async function handler(req, res) {
  try {
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
    const checkoutRequestID = stkCallback.CheckoutRequestID;

    if (resultCode === 0) {
      const metadata = stkCallback.CallbackMetadata?.Item || [];
      const getValue = (name) => metadata.find((i) => i.Name === name)?.Value;

      const amount = getValue("Amount");
      const receipt = getValue("MpesaReceiptNumber");
      const phone = getValue("PhoneNumber");

      console.log("✅ Payment Successful:", { amount, receipt, phone });

      global.payments[checkoutRequestID] = {
        status: "success",
        amount,
        receipt,
        phone,
      };
    } else {
      console.log("❌ Payment Failed:", stkCallback.ResultDesc);

      global.payments[checkoutRequestID] = {
        status: "failed",
        reason: stkCallback.ResultDesc,
      };
    }

    return res.status(200).json({ message: "Callback received successfully" });
  } catch (error) {
    console.error("🚨 CALLBACK ERROR:", error);
    return res.status(200).json({ message: "Error handled" });
  }
}
