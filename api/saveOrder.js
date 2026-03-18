import { supabase } from "../lib/supabase.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { checkoutRequestID, phone, amount, receipt } = req.body;

    if (!checkoutRequestID) {
      return res.status(400).json({
        error: "Missing checkoutRequestID",
      });
    }

    console.log("💾 Saving order:", checkoutRequestID);

    // ✅ OPTIONAL: You can create a separate "orders" table later
    // For now, we just confirm the payment exists

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("checkout_request_id", checkoutRequestID)
      .single();

    if (error || !data) {
      console.error("❌ Payment not found:", error);
      return res.status(404).json({
        error: "Payment not found",
      });
    }

    if (data.status !== "success") {
      return res.status(400).json({
        error: "Payment not completed",
      });
    }

    // ✅ SUCCESS RESPONSE
    return res.status(200).json({
      success: true,
      message: "Order saved successfully",
    });

  } catch (err) {
    console.error("🚨 SAVE ORDER ERROR:", err);

    return res.status(500).json({
      error: "Failed to save order",
    });
  }
}