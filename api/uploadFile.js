import { supabaseAdmin } from "../lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse multipart form data manually for Vercel
    // Since Vercel API routes receive raw body, we need to handle FormData
    const contentType = req.headers["content-type"] || "";

    if (!contentType.includes("multipart/form-data")) {
      return res.status(400).json({ error: "Expected multipart/form-data" });
    }

    // For Vercel, we need to use a buffer approach
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Extract boundary
    const boundary = contentType.split("boundary=")[1];
    if (!boundary) {
      return res.status(400).json({ error: "Missing boundary" });
    }

    // Parse multipart manually
    const parts = parseMultipart(buffer, boundary);

    const checkoutRequestID = parts.fields?.checkoutRequestID;
    const file = parts.files?.file;

    if (!checkoutRequestID || !file) {
      return res.status(400).json({ error: "Missing checkoutRequestID or file" });
    }

    const filePath = `uploads/${checkoutRequestID}/${file.filename}`;

    // Upload to Supabase Storage
    const { error } = await supabaseAdmin.storage
      .from("uploads")
      .upload(filePath, file.data, {
        contentType: file.contentType,
        upsert: true,
      });

    if (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ error: "Upload failed", details: error.message });
    }

    return res.status(200).json({ success: true, filePath });
  } catch (err) {
    console.error("Upload handler error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

// Simple multipart parser
function parseMultipart(buffer, boundary) {
  const result = { fields: {}, files: {} };
  const boundaryBytes = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = 0;

  while (true) {
    const idx = buffer.indexOf(boundaryBytes, start);
    if (idx === -1) break;
    if (start > 0) {
      parts.push(buffer.slice(start, idx - 2)); // -2 for \r\n before boundary
    }
    start = idx + boundaryBytes.length + 2; // +2 for \r\n after boundary
  }

  for (const part of parts) {
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const headers = part.slice(0, headerEnd).toString();
    const body = part.slice(headerEnd + 4);

    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const contentTypeMatch = headers.match(/Content-Type:\s*(.+)/i);

    if (!nameMatch) continue;
    const name = nameMatch[1];

    if (filenameMatch) {
      result.files[name] = {
        filename: filenameMatch[1],
        data: body,
        contentType: contentTypeMatch ? contentTypeMatch[1].trim() : "application/octet-stream",
      };
    } else {
      result.fields[name] = body.toString().trim();
    }
  }

  return result;
}

// Disable body parsing for multipart
export const config = {
  api: { bodyParser: false },
};
