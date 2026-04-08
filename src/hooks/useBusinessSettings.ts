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
        const map = { ...DEFAULTS };
        data.forEach((row: any) => {
          if (row.key && row.value) map[row.key] = row.value;
        });
        setSettings(map);
      }
      setLoading(false);
    })();
  }, []);

  return { settings, loading };
}
