import { withAuth } from "../../lib/auth.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return withAuth(req, res, async (req, res, auth) => {
    const { userId, permissions } = req.body;

    if (!userId || !permissions) {
      return res.status(400).json({ error: "userId and permissions required" });
    }

    const { error } = await supabaseAdmin
      .from("permissions")
      .upsert({ user_id: userId, permissions }, { onConflict: "user_id" });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Log
    await supabaseAdmin.from("activity_logs").insert({
      action: "permissions_updated",
      user_id: auth.user.id,
      user_email: auth.user.email,
      details: { target_user: userId, permissions },
    });

    return res.status(200).json({ success: true });
  }, { role: "admin" });
}
