import { supabase } from "../lib/supabase.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { withAuth } from "../lib/auth.js";

// ============================================================
// Consolidated API handler — all routes via ?route= query param
// ============================================================

export default async function handler(req, res) {
  const route = req.query?.route || "";

  switch (route) {
    case "stkPush":
      return handleStkPush(req, res);
    case "checkStatus":
      return handleCheckStatus(req, res);
    case "mpesaCallback":
      return handleMpesaCallback(req, res);
    case "saveOrder":
      return handleSaveOrder(req, res);
    case "getAccessToken":
      return handleGetAccessToken(req, res);
    case "cleanup":
      return handleCleanup(req, res);
    case "admin/analytics":
      return handleAdminAnalytics(req, res);
    case "admin/createCashier":
      return handleAdminCreateCashier(req, res);
    case "admin/deleteCashier":
      return handleAdminDeleteCashier(req, res);
    case "admin/files":
      return handleAdminFiles(req, res);
    case "admin/getCashiers":
      return handleAdminGetCashiers(req, res);
    case "admin/orders":
      return handleAdminOrders(req, res);
    case "admin/updatePermissions":
      return handleAdminUpdatePermissions(req, res);
    default:
      return res.status(404).json({ error: `Unknown route: ${route}` });
  }
}

// ============================================================
// STK Push
// ============================================================
async function handleStkPush(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    let { phone, amount } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ error: "Phone and amount are required" });
    }

    phone = phone.replace(/\s+/g, "");
    if (phone.startsWith("0")) phone = "254" + phone.slice(1);
    else if (phone.startsWith("+254")) phone = phone.replace("+", "");

    if (!/^254\d{9}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid phone format (use 07XXXXXXXX)" });
    }

    amount = Number(amount);
    if (isNaN(amount) || amount < 1) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;

    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenResponse = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { method: "GET", headers: { Authorization: `Basic ${auth}` } }
    );
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return res.status(500).json({ error: "Failed to get access token" });
    }

    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

    const stkResponse = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: phone,
          PartyB: shortcode,
          PhoneNumber: phone,
          CallBackURL: "https://expertech.vercel.app/api/mpesaCallback",
          AccountReference: "ExpertechPrint",
          TransactionDesc: "Printing Payment",
        }),
      }
    );

    const result = await stkResponse.json();

    if (result.ResponseCode === "0") {
      const checkoutRequestID = result.CheckoutRequestID || result.CheckoutRequestId;
      if (!checkoutRequestID) {
        return res.status(500).json({ success: false, error: "Missing CheckoutRequestID" });
      }

      await supabase.from("payments").upsert(
        {
          checkout_request_id: checkoutRequestID,
          status: "processing",
          phone,
          amount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "checkout_request_id" }
      );

      return res.status(200).json({
        success: true,
        checkoutRequestID,
        message: result.CustomerMessage || "STK Push sent successfully",
      });
    }

    return res.status(200).json({
      success: false,
      error: result.errorMessage || "STK Push failed",
      details: result,
    });
  } catch (error) {
    console.error("STK PUSH ERROR:", error);
    return res.status(500).json({ error: "STK Push failed", details: error.message });
  }
}

// ============================================================
// Check Status
// ============================================================
async function handleCheckStatus(req, res) {
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

    const { data, error } = await supabase
      .from("payments")
      .select("status, amount, receipt, phone, result_desc, updated_at")
      .eq("checkout_request_id", id)
      .maybeSingle();

    if (error) return res.status(500).json({ status: "error" });
    if (!data) return res.status(200).json({ status: "pending" });

    if (data.status === "success") {
      return res.status(200).json({
        status: "success",
        amount: data.amount ?? null,
        receipt: data.receipt ?? null,
        phone: data.phone ?? null,
      });
    }

    if (data.status === "failed") {
      return res.status(200).json({
        status: "failed",
        reason: data.result_desc || "Payment failed",
      });
    }

    const updatedAt = data.updated_at ? new Date(data.updated_at).getTime() : null;
    if (updatedAt && Date.now() - updatedAt > 120000) {
      return res.status(200).json({ status: "timeout" });
    }

    return res.status(200).json({ status: data.status || "pending" });
  } catch (err) {
    console.error("CHECK STATUS ERROR:", err);
    return res.status(500).json({ status: "error" });
  }
}

// ============================================================
// M-Pesa Callback
// ============================================================
async function handleMpesaCallback(req, res) {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body;
    const stkCallback = body?.Body?.stkCallback || body?.stkCallback || body;

    if (!stkCallback || !stkCallback.CheckoutRequestID) {
      return res.status(400).json({ error: "Invalid callback" });
    }

    const checkoutRequestID = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    let status = "failed";
    let receipt = null;
    let phone = null;
    let amount = null;

    if (resultCode === 0) {
      status = "success";
      const metadata = stkCallback.CallbackMetadata?.Item || [];
      const getValue = (name) => metadata.find((i) => i.Name === name)?.Value;
      receipt = getValue("MpesaReceiptNumber") || null;
      phone = getValue("PhoneNumber") || null;
      amount = getValue("Amount") || null;
    }

    const { error } = await supabase.from("payments").upsert(
      {
        checkout_request_id: checkoutRequestID,
        status,
        receipt,
        phone,
        amount,
        raw_response: stkCallback,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "checkout_request_id" }
    );

    if (error) {
      return res.status(500).json({ error: "DB error", details: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Callback error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

// ============================================================
// Save Order
// ============================================================
async function handleSaveOrder(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { checkoutRequestID } = req.body;
    if (!checkoutRequestID) {
      return res.status(400).json({ error: "Missing checkoutRequestID" });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("checkout_request_id", checkoutRequestID)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status !== "success") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    const { error } = await supabase.from("orders").upsert(
      {
        checkout_request_id: checkoutRequestID,
        phone: payment.phone,
        amount: payment.amount,
        receipt: payment.receipt,
      },
      { onConflict: "checkout_request_id" }
    );

    if (error) {
      return res.status(500).json({ error: "Failed to save order" });
    }

    return res.status(200).json({ success: true, message: "Order saved successfully (idempotent)" });
  } catch (err) {
    console.error("SAVE ORDER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ============================================================
// Get Access Token
// ============================================================
async function handleGetAccessToken(req, res) {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
      return res.status(500).json({ error: "Missing environment variables" });
    }

    const auth = Buffer.from(`${consumerKey.trim()}:${consumerSecret.trim()}`).toString("base64");

    const response = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { method: "GET", headers: { Authorization: `Basic ${auth}` } }
    );

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      return res.status(500).json({ error: "Failed to fetch access token", status: response.status, details: data });
    }

    return res.status(200).json({ success: true, access_token: data.access_token, expires_in: data.expires_in });
  } catch (error) {
    console.error("TOKEN ERROR:", error);
    return res.status(500).json({ error: "Token request failed", details: error.message });
  }
}

// ============================================================
// Cleanup expired files
// ============================================================
async function handleCleanup(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data: expired, error } = await supabaseAdmin
      .from("orders")
      .select("id, checkout_request_id, files")
      .lt("expires_at", new Date().toISOString())
      .not("files", "is", null);

    if (error) return res.status(500).json({ error: error.message });

    let deletedFiles = 0;
    let deletedOrders = 0;

    for (const order of expired || []) {
      if (order.files && order.files.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage
          .from("uploads")
          .remove(order.files);
        if (!storageError) deletedFiles += order.files.length;
      }

      if (order.checkout_request_id) {
        await supabaseAdmin.storage
          .from("uploads")
          .remove([`uploads/${order.checkout_request_id}`]);
      }
      deletedOrders++;
    }

    if (expired && expired.length > 0) {
      const ids = expired.map((o) => o.id);
      await supabaseAdmin.from("orders").update({ files: null }).in("id", ids);
    }

    return res.status(200).json({ success: true, deletedFiles, deletedOrders });
  } catch (err) {
    console.error("Cleanup error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ============================================================
// Admin: Analytics
// ============================================================
async function handleAdminAnalytics(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return withAuth(req, res, async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const { data: orders } = await supabaseAdmin.from("orders").select("amount, phone, created_at");

    const totalRevenue = (orders || []).reduce((sum, o) => sum + (o.amount || 0), 0);
    const totalOrders = (orders || []).length;
    const ordersToday = (orders || []).filter((o) => o.created_at >= todayStart).length;

    const customerMap = {};
    (orders || []).forEach((o) => {
      if (!o.phone) return;
      if (!customerMap[o.phone]) customerMap[o.phone] = { phone: o.phone, count: 0, total: 0 };
      customerMap[o.phone].count++;
      customerMap[o.phone].total += o.amount || 0;
    });

    const topCustomers = Object.values(customerMap).sort((a, b) => b.count - a.count).slice(0, 10);

    return res.status(200).json({ totalRevenue, totalOrders, ordersToday, topCustomers });
  }, { permission: "analytics" });
}

// ============================================================
// Admin: Create Cashier
// ============================================================
async function handleAdminCreateCashier(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return withAuth(req, res, async (req, res, auth) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
    });

    if (createError) return res.status(400).json({ error: createError.message });

    const userId = userData.user.id;

    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "cashier" });
    await supabaseAdmin.from("permissions").insert({
      user_id: userId,
      permissions: { orders: true, files: true, delete_orders: false, analytics: false, settings: false },
    });

    await supabaseAdmin.from("activity_logs").insert({
      action: "cashier_created",
      user_id: auth.user.id,
      user_email: auth.user.email,
      details: { created_email: email, created_user_id: userId },
    });

    return res.status(200).json({ success: true, userId });
  }, { role: "admin" });
}

// ============================================================
// Admin: Delete Cashier
// ============================================================
async function handleAdminDeleteCashier(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return withAuth(req, res, async (req, res, auth) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });

    await supabaseAdmin.from("permissions").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) return res.status(500).json({ error: error.message });

    await supabaseAdmin.from("activity_logs").insert({
      action: "cashier_deleted",
      user_id: auth.user.id,
      user_email: auth.user.email,
      details: { deleted_user: userId },
    });

    return res.status(200).json({ success: true });
  }, { role: "admin" });
}

// ============================================================
// Admin: Files (signed URLs)
// ============================================================
async function handleAdminFiles(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return withAuth(req, res, async (_req, res) => {
    const path = req.query?.path;
    if (!path) return res.status(400).json({ error: "Missing path parameter" });

    const { data, error } = await supabaseAdmin.storage
      .from("uploads")
      .createSignedUrl(path, 300);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ url: data.signedUrl });
  }, { permission: "files" });
}

// ============================================================
// Admin: Get Cashiers
// ============================================================
async function handleAdminGetCashiers(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return withAuth(req, res, async (_req, res) => {
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "cashier");

    if (error) return res.status(500).json({ error: error.message });
    if (!roles || roles.length === 0) return res.status(200).json({ cashiers: [] });

    const userIds = roles.map((r) => r.user_id);

    const { data: perms } = await supabaseAdmin
      .from("permissions")
      .select("user_id, permissions")
      .in("user_id", userIds);

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

// ============================================================
// Admin: Orders
// ============================================================
async function handleAdminOrders(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return withAuth(req, res, async (req, res) => {
    const search = req.query?.search || "";

    let query = supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (search) {
      query = query.or(`phone.ilike.%${search}%,receipt.ilike.%${search}%,checkout_request_id.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ orders: data || [] });
  }, { permission: "orders" });
}

// ============================================================
// Admin: Update Permissions
// ============================================================
async function handleAdminUpdatePermissions(req, res) {
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

    if (error) return res.status(500).json({ error: error.message });

    await supabaseAdmin.from("activity_logs").insert({
      action: "permissions_updated",
      user_id: auth.user.id,
      user_email: auth.user.email,
      details: { target_user: userId, permissions },
    });

    return res.status(200).json({ success: true });
  }, { role: "admin" });
}
