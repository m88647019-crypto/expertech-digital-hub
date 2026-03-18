import { supabase } from "../lib/supabase";

export function trackPayment(checkoutRequestID, onUpdate) {
  let isDone = false;
  let attempts = 0;
  const maxAttempts = 12;
  let delay = 3000;

  let pollTimeout = null;
  let channel = null;

  const stopAll = () => {
    isDone = true;

    if (pollTimeout) clearTimeout(pollTimeout);

    if (channel) {
      supabase.removeChannel(channel);
      console.log("🛑 Realtime unsubscribed");
    }
  };

  // ⚡ REALTIME
  channel = supabase
    .channel("payments-realtime")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "payments",
        filter: `checkout_request_id=eq.${checkoutRequestID}`,
      },
      (payload) => {
        console.log("⚡ Realtime:", payload.new);

        if (isDone) return;

        const status = payload.new.status;

        if (status === "success" || status === "failed") {
          stopAll();

          onUpdate({
            status,
            data: payload.new,
            source: "realtime",
          });
        }
      }
    )
    .subscribe();

  // 🔁 POLLING
  async function poll() {
    if (isDone) return;

    try {
      attempts++;

      console.log(`[POLL] Attempt ${attempts}`);

      const res = await fetch(
        `/api/checkStatus?id=${checkoutRequestID}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (data.status === "success" || data.status === "failed") {
        stopAll();

        onUpdate({
          status: data.status,
          data,
          source: "polling",
        });

        return;
      }

      if (attempts >= maxAttempts) {
        stopAll();
        onUpdate({ status: "timeout" });
        return;
      }

      delay = Math.min(delay * 1.5, 6000);
      pollTimeout = setTimeout(poll, delay);

    } catch (err) {
      console.error("🚨 Poll error:", err);

      if (attempts >= maxAttempts) {
        stopAll();
        onUpdate({ status: "error" });
        return;
      }

      pollTimeout = setTimeout(poll, delay);
    }
  }

  // Start polling after 2.5s
  pollTimeout = setTimeout(poll, 2500);

  return stopAll;
}