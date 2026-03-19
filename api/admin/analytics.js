import { withAuth } from "../../lib/auth.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return withAuth(req, res, async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // Total revenue & orders
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("amount, phone, created_at");

    const totalRevenue = (orders || []).reduce((sum, o) => sum + (o.amount || 0), 0);
    const totalOrders = (orders || []).length;
    const ordersToday = (orders || []).filter((o) => o.created_at >= todayStart).length;

    // Top customers
    const customerMap = {};
    (orders || []).forEach((o) => {
      if (!o.phone) return;
      if (!customerMap[o.phone]) {
        customerMap[o.phone] = { phone: o.phone, count: 0, total: 0 };
      }
      customerMap[o.phone].count++;
      customerMap[o.phone].total += o.amount || 0;
    });

    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return res.status(200).json({
      totalRevenue,
      totalOrders,
      ordersToday,
      topCustomers,
    });
  }, { permission: "analytics" });
}
