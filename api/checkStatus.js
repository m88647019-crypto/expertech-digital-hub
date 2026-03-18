import { supabase } from "../lib/supabase.js";

export default async function handler(req, res) {
  // 🔥 Prevent caching
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    // ✅ Allow only GET
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const rawId = req.query?.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      return res.status(400).json({ error: "Missing checkoutRequestID" });
    }

    console.log("🔎 Checking status for:", id);

    // ✅ Fetch from Supabase instead of memory
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("checkout_request_id", id)
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase fetch error:", error);
      return res.status(500).json({ status: "error" });
    }

    // ✅ Not yet written by callback → still pending
    if (!data) {
      return res.status(200).json({ status: "pending" });
    }

    console.log("🧠 DB payment:", data);

    // ✅ Success
    if (data.status === "success") {
      return res.status(200).json({
        status: "success",
        amount: data.amount ?? null,
        receipt: data.receipt ?? null,
        phone: data.phone ?? null,
      });
    }

    // ❌ Failed
    if (data.status === "failed") {
      return res.status(200).json({
        status: "failed",
        reason: data.raw_response?.ResultDesc || "Payment failed",
      });
    }

    // ⏳ Still pending
    return res.status(200).json({ status: "pending" });

  } catch (error) {
    console.error("🚨 CHECK STATUS ERROR:", error);
    return res.status(500).json({ error: "Status check failed" });
  }
}