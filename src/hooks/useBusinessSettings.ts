import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface BusinessSettings {
  business_name: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  bw_price: string;
  color_price: string;
  [key: string]: string;
}

const DEFAULTS: BusinessSettings = {
  business_name: "Expertech Digital Hub",
  contact_email: "expertechcomputers1@gmail.com",
  contact_phone: "+254 746 721989",
  whatsapp_number: "254746721989",
  bw_price: "10",
  color_price: "20",
};

export function useBusinessSettings() {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("business_settings").select("key, value");
      if (data && data.length > 0) {
        const raw: Record<string, string> = {};
        data.forEach((row: any) => { if (row.key) raw[row.key] = row.value ?? ""; });
        // Map legacy keys → canonical keys (only if canonical empty)
        const aliases: Record<string, string> = {
          phone_number: "contact_phone",
          email: "contact_email",
          price_per_page_bw: "bw_price",
          price_per_page_color: "color_price",
        };
        Object.entries(aliases).forEach(([legacy, canonical]) => {
          if (!raw[canonical] && raw[legacy]) raw[canonical] = raw[legacy];
        });
        setSettings({ ...DEFAULTS, ...raw } as BusinessSettings);
      }
      setLoading(false);
    })();
  }, []);

  return { settings, loading };
}
