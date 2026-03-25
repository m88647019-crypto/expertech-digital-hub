import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("business_settings").select("*");
      const map: Record<string, string> = {};
      (data || []).forEach((row: any) => { map[row.key] = row.value; });
      setSettings(map);
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const rows = Object.entries(settings).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from("business_settings").upsert(rows, { onConflict: "key" });
    if (error) toast({ title: "Failed to save settings", variant: "destructive" });
    else toast({ title: "Settings saved" });
    setSaving(false);
  };

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const fields = [
    { key: "business_name", label: "Business Name" },
    { key: "contact_email", label: "Contact Email" },
    { key: "contact_phone", label: "Contact Phone" },
    { key: "whatsapp_number", label: "WhatsApp Number" },
    { key: "bw_price", label: "B&W Price per Page (KES)", type: "number" },
    { key: "color_price", label: "Color Price per Page (KES)", type: "number" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold text-foreground">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label>{f.label}</Label>
              <Input
                type={f.type || "text"}
                value={settings[f.key] || ""}
                onChange={(e) => update(f.key, e.target.value)}
              />
            </div>
          ))}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
