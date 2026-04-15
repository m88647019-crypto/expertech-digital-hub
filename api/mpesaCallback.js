import { supabase } from "../lib/supabase.js"; // ✅ FIXED (.js required)

export default async function handler(req, res) {
  // 🔥 Prevent caching
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body;

    console.log("📥 Raw callback:", JSON.stringify(body));

    // ✅ Handle all possible Daraja formats
    const stkCallback =
      body?.Body?.stkCallback ||
      body?.stkCallback ||
      body;

    if (!stkCallback || !stkCallback.CheckoutRequestID) {
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

    // ✅ SUCCESS CASE
    if (resultCode === 0) {
      status = "success";

      const metadata = stkCallback.CallbackMetadata?.Item || [];

      const getValue = (name) =>
        metadata.find((i) => i.Name === name)?.Value;

      receipt = getValue("MpesaReceiptNumber") || null;
      phone = getValue("PhoneNumber") || null;
      amount = getValue("Amount") || null;
    }

    // ❌ FAILURE CASE
    if (resultCode !== 0) {
      status = "failed";
      console.warn("❌ Payment failed:", resultDesc);
    }

    // ✅ UPSERT INTO SUPABASE (with conflict handling)
    const { error } = await supabase
      .from("payments")
      .upsert(
        {
          checkout_request_id: checkoutRequestID,
          status,
          receipt,
          phone,
          amount,
          raw_response: stkCallback,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "checkout_request_id", // 🔥 IMPORTANT
        }
      );

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return res.status(500).json({ error: "DB error", details: error.message });
    }

    console.log("✅ Stored payment:", {
      checkoutRequestID,
      status,
      receipt,
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("🚨 Callback error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
}