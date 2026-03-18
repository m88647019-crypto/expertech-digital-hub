import { supabase } from "../lib/supabase";

export default async function handler(req, res) {
  try {
    const body = req.body;

    const stkCallback =
      body?.Body?.stkCallback || body?.stkCallback || body;

    if (!stkCallback) {
      console.error("❌ Invalid callback format:", body);
      return res.status(400).json({ error: "Invalid callback" });
    }

    const checkoutRequestID = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    let status = "failed";
    let receipt = null;
    let phone = null;
    let amount = null;

    if (resultCode === 0) {
      status = "success";

      const metadata = stkCallback.CallbackMetadata?.Item || [];

      const getValue = (name) =>
        metadata.find((i) => i.Name === name)?.Value;

      receipt = getValue("MpesaReceiptNumber") || null;
      phone = getValue("PhoneNumber") || null;
      amount = getValue("Amount") || null;
    }

    // ✅ UPSERT into Supabase
    const { error } = await supabase.from("payments").upsert({
      checkout_request_id: checkoutRequestID,
      status,
      receipt,
      phone,
      amount,
      raw_response: stkCallback,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return res.status(500).json({ error: "DB error" });
    }

    console.log("✅ Stored payment:", {
      checkoutRequestID,
      status,
      receipt,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("🚨 Callback error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}