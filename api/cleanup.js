import { supabaseAdmin } from "../lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Find orders with expired files
    const { data: expired, error } = await supabaseAdmin
      .from("orders")
      .select("id, checkout_request_id, files")
      .lt("expires_at", new Date().toISOString())
      .not("files", "is", null);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    let deletedFiles = 0;
    let deletedOrders = 0;

    for (const order of expired || []) {
      // Delete files from storage
      if (order.files && order.files.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage
          .from("uploads")
          .remove(order.files);

        if (!storageError) {
          deletedFiles += order.files.length;
        }
      }

      // Also try to remove the folder
      if (order.checkout_request_id) {
        await supabaseAdmin.storage
          .from("uploads")
          .remove([`uploads/${order.checkout_request_id}`]);
      }

      deletedOrders++;
    }

    // Update orders to mark files as cleaned
    if (expired && expired.length > 0) {
      const ids = expired.map((o) => o.id);
      await supabaseAdmin
        .from("orders")
        .update({ files: null })
        .in("id", ids);
    }

    return res.status(200).json({
      success: true,
      deletedFiles,
      deletedOrders,
    });
  } catch (err) {
    console.error("Cleanup error:", err);
    return res.status(500).json({ error: err.message });
  }
}
