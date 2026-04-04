import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

// 🔥 Fail fast if missing (prevents silent crashes)
if (!supabaseUrl || !supabaseKey) {
  throw new Error("❌ Missing backend environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);