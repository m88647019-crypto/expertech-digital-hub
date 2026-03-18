import { supabase } from "../lib/supabase.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { checkoutRequestID } = req.body;

    if (!checkoutRequestID) {
      return res.status(400).json({
        error: "Missing checkoutRequestID",
      });
    }

    console.log("💾 Saving order:", checkoutRequestID);

    // =========================
    // ✅ VERIFY PAYMENT
    // =========================
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("checkout_request_id", checkoutRequestID)
      .single();

    if (paymentError || !payment) {
      console.error("❌ Payment fetch error:", paymentError);

      return res.status(404).json({
        error: "Payment not found",
      });
    }

    if (payment.status !== "success") {
      return res.status(400).json({
        error: "Payment not completed",
      });
    }

    // =========================
    // ✅ UPSERT ORDER (IDEMPOTENT)
    // =========================
    const { error } = await supabase.from("orders").upsert(
      {
        checkout_request_id: checkoutRequestID,
        phone: payment.phone,
        amount: payment.amount,
        receipt: payment.receipt,
      },
      {
        onConflict: "checkout_request_id",
      }
    );

    if (error) {
      console.error("❌ Upsert error:", error);

      return res.status(500).json({
        error: "Failed to save order",
      });
    }

    // =========================
    // ✅ SUCCESS
    // =========================
    return res.status(200).json({
      success: true,
      message: "Order saved successfully (idempotent)",
    });

  } catch (err) {
    console.error("🚨 SAVE ORDER ERROR:", err);

    return res.status(500).json({
      error: "Server error",
    });
  }
}