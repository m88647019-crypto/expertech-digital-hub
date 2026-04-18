import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const SETTING_FIELDS = [
  { key: "business_name", label: "Business Name", placeholder: "Expertech Digital Hub", description: "Shown in footer and branding" },
  { key: "contact_email", label: "Contact Email", placeholder: "info@expertech.co.ke", type: "email", description: "Displayed on website footer" },
  { key: "contact_phone", label: "Contact Phone", placeholder: "+254 746 721989", type: "tel", description: "Displayed on website footer" },
  { key: "whatsapp_number", label: "WhatsApp Number", placeholder: "254746721989", description: "Used for WhatsApp chat button (format: 254XXXXXXXXX)" },
  { key: "bw_price", label: "B&W Price per Page (KES)", placeholder: "10", type: "number", description: "Black & white printing rate" },
  { key: "color_price", label: "Color Price per Page (KES)", placeholder: "20", type: "number", description: "Color printing rate" },
];

export default function AdminSettings() {
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
    if (error) {
      toast.error("Failed to save settings", { description: error.message });
    } else {
      toast.success("Settings saved successfully", {
        description: "Changes are now live on your website.",
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
    }
    setSaving(false);
  };

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100">Settings</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">Business configuration shown across your public site.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Configuration</CardTitle>
          <CardDescription>
            These settings are displayed on your public website — footer, WhatsApp button, and pricing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {SETTING_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label>{f.label}</Label>
              <Input
                type={f.type || "text"}
                placeholder={f.placeholder}
                value={settings[f.key] || ""}
                onChange={(e) => update(f.key, e.target.value)}
              />
              {f.description && (
                <p className="text-xs text-muted-foreground">{f.description}</p>
              )}
            </div>
          ))}
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
