import { withAuth } from "../../lib/auth.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return withAuth(req, res, async (req, res, auth) => {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Delete from permissions
    await supabaseAdmin.from("permissions").delete().eq("user_id", userId);

    // Delete from user_roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

    // Delete from auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Log
    await supabaseAdmin.from("activity_logs").insert({
      action: "cashier_deleted",
      user_id: auth.user.id,
      user_email: auth.user.email,
      details: { deleted_user: userId },
    });

    return res.status(200).json({ success: true });
  }, { role: "admin" });
}
