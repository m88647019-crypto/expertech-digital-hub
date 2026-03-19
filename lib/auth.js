import { supabaseAdmin } from "./supabaseAdmin.js";

/**
 * Verify JWT from Authorization header.
 * Returns { user, role, permissions } or throws.
 */
export async function verifyAuth(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw { status: 401, message: "Missing or invalid authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");

  // Verify user
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw { status: 401, message: "Invalid or expired token" };
  }

  // Get role
  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const role = roleData?.role || "user";

  // Get permissions
  const { data: permData } = await supabaseAdmin
    .from("permissions")
    .select("permissions")
    .eq("user_id", user.id)
    .single();

  const permissions = permData?.permissions || {};

  return { user, role, permissions };
}

/**
 * Require specific role. Use after verifyAuth.
 */
export function requireRole(role, requiredRole) {
  if (role !== requiredRole && role !== "admin") {
    throw { status: 403, message: `Requires ${requiredRole} role` };
  }
}

/**
 * Check permission. Use after verifyAuth.
 */
export function checkPermission(permissions, key) {
  if (!permissions[key]) {
    throw { status: 403, message: `Missing permission: ${key}` };
  }
}

/**
 * Middleware wrapper for API routes.
 */
export async function withAuth(req, res, handler, options = {}) {
  try {
    const auth = await verifyAuth(req);

    if (options.role) {
      requireRole(auth.role, options.role);
    }

    if (options.permission) {
      checkPermission(auth.permissions, options.permission);
    }

    return handler(req, res, auth);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Auth error";
    return res.status(status).json({ error: message });
  }
}
