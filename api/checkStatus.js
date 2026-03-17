if (!global.payments) {
  global.payments = {};
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Missing checkoutRequestID" });
    }

    const payment = global.payments[id];

    if (!payment) {
      return res.status(200).json({ status: "pending" });
    }

    return res.status(200).json({
      status: payment.status,
      receipt: payment.receipt || null,
    });
  } catch (error) {
    console.error("CHECK STATUS ERROR:", error);
    return res.status(500).json({ error: "Status check failed" });
  }
}
