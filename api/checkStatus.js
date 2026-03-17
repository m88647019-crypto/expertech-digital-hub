import { getPaymentsStore } from "../lib/paymentStore.js";

if (!global.payments) {
  global.payments = {};
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const rawId = req.query?.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      return res.status(400).json({ error: "Missing checkoutRequestID" });
    }

    const payments = getPaymentsStore();
    const payment = payments[id];

    console.log("🔎 Queried ID:", id);

    if (!payment) {
      return res.status(200).json({ status: "pending" });
    }

    console.log("🧾 Stored checkoutRequestID:", id);
    console.log("🧠 Stored payment lookup:", payment);

    if (payment.status === "success") {
      return res.status(200).json({
        status: "success",
        amount: payment.amount ?? null,
        receipt: payment.receipt ?? null,
        phone: payment.phone ?? null,
      });
    }

    if (payment.status === "failed") {
      return res.status(200).json({
        status: "failed",
        reason: payment.reason || "Payment failed",
      });
    }

    return res.status(200).json({ status: "pending" });
  } catch (error) {
    console.error("🚨 CHECK STATUS ERROR:", error);
    return res.status(500).json({ error: "Status check failed" });
  }
}
