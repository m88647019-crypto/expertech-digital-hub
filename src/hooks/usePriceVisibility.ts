import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Global toggle: should service cards on the public site show prices?
 * Defaults to true if the setting row is missing.
 * The booking form always shows prices regardless.
 */
export function usePriceVisibility() {
  const [showPrices, setShowPrices] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("value")
        .eq("key", "show_prices_on_cards")
        .maybeSingle();
      if (data?.value === "false") setShowPrices(false);
      else setShowPrices(true);
      setLoading(false);
    })();
  }, []);

  return { showPrices, loading };
}
