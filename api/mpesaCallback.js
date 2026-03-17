import { getPaymentsStore } from "../lib/paymentStore.js";

if (!global.payments) {
  global.payments = {};
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const stkCallback = req.body?.Body?.stkCallback;
    if (!stkCallback) {
      console.warn("⚠️ Invalid callback structure");
      return res.status(200).json({ message: "Invalid structure handled" });
    }

    const checkoutRequestID = stkCallback.CheckoutRequestID ?? stkCallback.CheckoutRequestId ?? null;
    if (!checkoutRequestID) {
      console.warn("⚠️ Missing CheckoutRequestID in callback");
      return res.status(200).json({ message: "Missing CheckoutRequestID handled" });
    }

    const metadata = stkCallback.CallbackMetadata?.Item || [];
    const getValue = (name) => metadata.find((item) => item.Name === name)?.Value ?? null;

    const amount = getValue("Amount");
    const receipt = getValue("MpesaReceiptNumber");
    const phone = getValue("PhoneNumber");

    const payments = getPaymentsStore();
    const resultCode = Number(stkCallback.ResultCode);

    if (resultCode === 0) {
      payments[checkoutRequestID] = {
        status: "success",
        amount,
        receipt,
        phone,
      };
    } else {
      payments[checkoutRequestID] = {
        status: "failed",
        reason: stkCallback.ResultDesc || "Payment failed",
      };
    }

    console.log("🧾 Stored checkoutRequestID:", checkoutRequestID);
    console.log("🧠 Stored payment state:", payments[checkoutRequestID]);

    return res.status(200).json({ message: "Callback processed successfully" });
  } catch (error) {
    console.error("🚨 CALLBACK ERROR:", error);
    return res.status(200).json({ message: "Error handled safely" });
  }
}
