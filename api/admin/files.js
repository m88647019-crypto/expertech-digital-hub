import { withAuth } from "../../lib/auth.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return withAuth(req, res, async (_req, res) => {
    const path = req.query?.path;

    if (path) {
      // Generate signed URL for a specific file
      const { data, error } = await supabaseAdmin.storage
        .from("uploads")
        .createSignedUrl(path, 300); // 5 minutes

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ url: data.signedUrl });
    }

    return res.status(400).json({ error: "Missing path parameter" });
  }, { permission: "files" });
}
