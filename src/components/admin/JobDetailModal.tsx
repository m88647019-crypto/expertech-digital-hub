import { useState } from "react";
import type { PrintJob, JobStatus, PaymentMethod } from "@/types/printJob";
import { JOB_STATUSES, STATUS_COLORS, PAYMENT_METHODS } from "@/types/printJob";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Mail, ExternalLink, Download, Loader2 } from "lucide-react";

interface Props {
  job: PrintJob;
  onClose: () => void;
  onUpdate: (updates: Partial<PrintJob>) => Promise<void>;
}

export default function JobDetailModal({ job, onClose, onUpdate }: Props) {
  const [status, setStatus] = useState<string>(job.status);
  const [notes, setNotes] = useState(job.notes || "");
  const [price, setPrice] = useState(job.price?.toString() || "0");
  const [paid, setPaid] = useState(job.paid);
  const [paymentMethod, setPaymentMethod] = useState(job.payment_method || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({
      status: status as JobStatus,
      notes,
      price: parseFloat(price) || 0,
      paid,
      payment_method: paymentMethod as PaymentMethod || null,
    });
    setSaving(false);
  };

  const openWhatsApp = () => {
    const msg = encodeURIComponent(
      `Hello ${job.name || "Customer"}, your document is ready for pickup at Expertech Digital Hub.`
    );
    window.open(`https://wa.me/${job.phone?.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Job Details</DialogTitle>
          <DialogDescription>View and edit print job details</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Customer</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Name:</span> {job.name || "—"}</p>
              <p><span className="text-muted-foreground">Email:</span> {job.email || "—"}</p>
              <p><span className="text-muted-foreground">Phone:</span> {job.phone || "—"}</p>
            </div>

            <div className="flex gap-2">
              {job.phone && (
                <Button size="sm" variant="outline" onClick={openWhatsApp} className="text-emerald-600">
                  <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                </Button>
              )}
              {job.email && (
                <Button size="sm" variant="outline" onClick={() => {
                  window.open(`mailto:${job.email}?subject=Your Print Job - Expertech`, "_blank");
                }} className="text-blue-600">
                  <Mail className="h-4 w-4 mr-1" /> Email
                </Button>
              )}
            </div>
          </div>

          {/* Print Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Print Settings</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Copies:</span> {job.copies}</p>
              <p><span className="text-muted-foreground">Color:</span> {job.color_option === "color" ? "Color" : "B&W"}</p>
              <p><span className="text-muted-foreground">Paper:</span> {job.paper_size}</p>
              <p><span className="text-muted-foreground">Branch:</span> {job.branch || "—"}</p>
            </div>

            {job.instructions && (
              <div>
                <p className="text-sm text-muted-foreground">Instructions:</p>
                <p className="text-sm bg-muted/50 p-2 rounded">{job.instructions}</p>
              </div>
            )}
          </div>

          {/* File Preview */}
          {job.file_url && (
            <div className="space-y-2 md:col-span-2">
              <h3 className="text-sm font-semibold text-foreground">File</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => window.open(job.file_url!, "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-1" /> Preview
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={job.file_url} download>
                    <Download className="h-4 w-4 mr-1" /> Download
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* Editable fields */}
          <div className="space-y-3 md:col-span-2 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">Update Job</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <Badge className={STATUS_COLORS[status as JobStatus] || "bg-muted"}>{status}</Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Price (KES)</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={paid} onCheckedChange={(c) => setPaid(!!c)} />
              <Label className="text-sm">Marked as Paid</Label>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Add admin notes..." />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
