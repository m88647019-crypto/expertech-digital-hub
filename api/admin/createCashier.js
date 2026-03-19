import { withAuth } from "../../lib/auth.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return withAuth(req, res, async (req, res, auth) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Create user in Supabase Auth
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      console.error("Create user error:", createError);
      return res.status(400).json({ error: createError.message });
    }

    const userId = userData.user.id;

    // Assign cashier role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "cashier" });

    if (roleError) {
      console.error("Role insert error:", roleError);
    }

    // Create default permissions
    const { error: permError } = await supabaseAdmin
      .from("permissions")
      .insert({
        user_id: userId,
        permissions: { orders: true, files: true, delete_orders: false, analytics: false, settings: false },
      });

    if (permError) {
      console.error("Permissions insert error:", permError);
    }

    // Log activity
    await supabaseAdmin.from("activity_logs").insert({
      action: "cashier_created",
      user_id: auth.user.id,
      user_email: auth.user.email,
      details: { created_email: email, created_user_id: userId },
    });

    return res.status(200).json({ success: true, userId });
  }, { role: "admin" });
}
