// ✅ Ensure shared memory exists
if (!global.payments) {
  global.payments = {};
}

export default async function handler(req, res) {
  // 🔥 Prevent caching (fixes 304 issue)
  res.setHeader("Cache-Control", "no-store");

  try {
    // ✅ Only allow GET
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Missing checkoutRequestID" });
    }

    const payment = global.payments[id];

    // 🧠 Debug log (very useful)
    console.log("🔎 Checking payment status for:", id);
    console.log("🧠 Current store:", global.payments);

    // ⏳ Still pending
    if (!payment) {
      return res.status(200).json({
        status: "pending",
      });
    }

    // ✅ Success
    if (payment.status === "success") {
      return res.status(200).json({
        status: "success",
        receipt: payment.receipt || null,
        amount: payment.amount || null,
        phone: payment.phone || null,
      });
    }

    // ❌ Failed
    if (payment.status === "failed") {
      return res.status(200).json({
        status: "failed",
        reason: payment.reason || "Payment failed",
      });
    }

    // ⚠️ Fallback (should not happen)
    return res.status(200).json({
      status: "pending",
    });

  } catch (error) {
    console.error("🚨 CHECK STATUS ERROR:", error);

    return res.status(500).json({
      error: "Status check failed",
    });
  }
}