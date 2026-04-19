import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_TERMS = `# Terms of Service

Welcome to Expertech Digital Hub. By using our services you agree to the following terms.

## 1. Services
We provide printing, government e-services, and related digital assistance.

## 2. Payments
All prices are in KES. Payments are processed securely via M-Pesa.

## 3. File Handling
Uploaded files are automatically deleted 24 hours after processing for your privacy.

## 4. Liability
We are not liable for delays caused by third-party government portals.

## 5. Contact
For any questions, contact us using the details on our website footer.`;

export function useTerms() {
  const [terms, setTerms] = useState<string>(DEFAULT_TERMS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("value")
        .eq("key", "terms_of_service")
        .maybeSingle();
      if (data?.value) setTerms(data.value);
      setLoading(false);
    })();
  }, []);

  return { terms, loading };
}

export { DEFAULT_TERMS };
