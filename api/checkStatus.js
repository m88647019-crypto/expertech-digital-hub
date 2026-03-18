import { supabase } from "../lib/supabase.js";

export default async function handler(req, res) {
  // 🔥 Strong anti-cache headers
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    // ✅ Only GET
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const rawId = req.query?.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      return res.status(400).json({ error: "Missing checkoutRequestID" });
    }

    console.log("🔎 Checking status for:", id);

    // =========================
    // ✅ FETCH PAYMENT
    // =========================
    const { data, error } = await supabase
      .from("payments")
      .select(
        "status, amount, receipt, phone, result_desc, updated_at"
      )
      .eq("checkout_request_id", id)
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase fetch error:", error);
      return res.status(500).json({ status: "error" });
    }

    // =========================
    // ⏳ NOT FOUND → STILL PROCESSING
    // =========================
    if (!data) {
      return res.status(200).json({
        status: "pending",
      });
    }

    // =========================
    // ✅ SUCCESS
    // =========================
    if (data.status === "success") {
      return res.status(200).json({
        status: "success",
        amount: data.amount ?? null,
        receipt: data.receipt ?? null,
        phone: data.phone ?? null,
      });
    }

    // =========================
    // ❌ FAILED
    // =========================
    if (data.status === "failed") {
      return res.status(200).json({
        status: "failed",
        reason: data.result_desc || "Payment failed",
      });
    }

    // =========================
    // 🧠 OPTIONAL: TIMEOUT DETECTION
    // =========================
    const updatedAt = data.updated_at
      ? new Date(data.updated_at).getTime()
      : null;

    const now = Date.now();

    // If stuck > 2 minutes → treat as timeout
    if (updatedAt && now - updatedAt > 120000) {
      return res.status(200).json({
        status: "timeout",
      });
    }

    // =========================
    // ⏳ STILL PROCESSING
    // =========================
    return res.status(200).json({
      status: data.status || "pending",
    });

  } catch (err) {
    console.error("🚨 CHECK STATUS ERROR:", err);
    return res.status(500).json({
      status: "error",
    });
  }
}