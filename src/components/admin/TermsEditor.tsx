import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, ExternalLink, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { DEFAULT_TERMS } from "@/hooks/useTerms";

export default function TermsEditor() {
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("value")
        .eq("key", "terms_of_service")
        .maybeSingle();
      const v = data?.value || DEFAULT_TERMS;
      setContent(v);
      setOriginal(v);
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("business_settings")
      .upsert([{ key: "terms_of_service", value: content }], { onConflict: "key" });
    if (error) {
      toast.error("Failed to save", { description: error.message });
    } else {
      setOriginal(content);
      toast.success("Terms updated", {
        description: "Your public Terms page is now live.",
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
    }
    setSaving(false);
  };

  const dirty = content !== original;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold admin-text">Terms of Service</h2>
          <p className="text-xs sm:text-sm admin-muted mt-1">
            Edit the legal terms shown on your public <code>/terms</code> page. Supports basic markdown
            (<code>#</code>, <code>##</code>, <code>**bold**</code>, <code>- list</code>).
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/terms" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-1" /> Preview
          </Link>
        </Button>
      </div>

      <Card className="admin-surface border-0">
        <CardHeader>
          <CardTitle className="text-base admin-text">Content</CardTitle>
          <CardDescription>
            Use clear sections (Services, Payments, Privacy, Liability). Customers can review this before booking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[420px] font-mono text-sm leading-relaxed"
            placeholder="# Terms of Service..."
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving || !dirty}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={() => setContent(original)}
              disabled={!dirty || saving}
            >
              <RotateCcw className="h-4 w-4 mr-1" /> Discard
            </Button>
            {dirty && (
              <span className="text-xs admin-muted self-center">Unsaved changes</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
