import { withAuth } from "../../lib/auth.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return withAuth(req, res, async (_req, res) => {
    // Get all cashiers
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "cashier");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!roles || roles.length === 0) {
      return res.status(200).json({ cashiers: [] });
    }

    const userIds = roles.map((r) => r.user_id);

    // Get permissions
    const { data: perms } = await supabaseAdmin
      .from("permissions")
      .select("user_id, permissions")
      .in("user_id", userIds);

    // Get user emails from auth
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();

    const cashiers = roles.map((r) => {
      const authUser = users?.find((u) => u.id === r.user_id);
      const perm = perms?.find((p) => p.user_id === r.user_id);
      return {
        id: r.user_id,
        email: authUser?.email || "Unknown",
        created_at: authUser?.created_at || "",
        permissions: perm?.permissions || {},
      };
    });

    return res.status(200).json({ cashiers });
  }, { role: "admin" });
}
