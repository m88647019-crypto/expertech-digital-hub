import { useState } from "react";
import { useServiceRequests } from "@/hooks/useServices";
import type { ServiceRequest } from "@/hooks/useServices";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Search, RefreshCw, Loader2, Trash2, Eye, MessageCircle, Filter,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = ["pending", "confirmed", "in_progress", "completed", "cancelled"] as const;
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function ServiceRequestsTable() {
  const { requests, loading, refetch, updateRequest, deleteRequest } = useServiceRequests();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailReq, setDetailReq] = useState<ServiceRequest | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPaid, setEditPaid] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = requests.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.customer_name.toLowerCase().includes(q) ||
        r.customer_phone.includes(q) ||
        r.service_name.toLowerCase().includes(q);
    }
    return true;
  });

  const openDetail = (req: ServiceRequest) => {
    setDetailReq(req);
    setEditStatus(req.status);
    setEditNotes(req.admin_notes || "");
    setEditPaid(req.paid);
  };

  const handleSave = async () => {
    if (!detailReq) return;
    setSaving(true);
    const { error } = await updateRequest(detailReq.id, {
      status: editStatus as any,
      admin_notes: editNotes,
      paid: editPaid,
    });
    if (error) toast.error("Failed to update");
    else toast.success("Request updated");
    setSaving(false);
    setDetailReq(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this request?")) return;
    const { error } = await deleteRequest(id);
    if (error) toast.error("Failed to delete");
    else toast.success("Request deleted");
  };

  const handleInlineStatus = async (req: ServiceRequest, newStatus: string) => {
    const { error } = await updateRequest(req.id, { status: newStatus as any });
    if (error) toast.error("Failed to update status");
    else toast.success(`Status → ${newStatus.replace("_", " ")}`);
  };

  const openWhatsApp = (req: ServiceRequest) => {
    const msg = encodeURIComponent(
      `Hello ${req.customer_name}, regarding your "${req.service_name}" request at Expertech Digital Hub — it is now ${req.status}. Thank you!`
    );
    window.open(`https://wa.me/${req.customer_phone.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">Service Requests</h2>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No service requests found</CardContent></Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{req.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{req.customer_phone}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{req.service_name}</p>
                        <p className="text-xs text-muted-foreground">{req.branch}</p>
                      </TableCell>
                      <TableCell>
                        <Select value={req.status} onValueChange={(v) => handleInlineStatus(req, v)}>
                          <SelectTrigger className="h-7 text-xs w-28 p-1">
                            <Badge className={`${STATUS_COLORS[req.status] || "bg-muted"} text-[10px]`}>
                              {req.status.replace("_", " ")}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                <Badge className={`${STATUS_COLORS[s]} text-[10px]`}>{s.replace("_", " ")}</Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="font-medium">
                        {req.price ? `KES ${Number(req.price).toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={req.paid ? "default" : "outline"} className={req.paid ? "bg-emerald-100 text-emerald-800" : ""}>
                          {req.paid ? "Paid" : "Unpaid"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(req.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(req)} title="View">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {req.customer_phone && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => openWhatsApp(req)} title="WhatsApp">
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(req.id)} title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((req) => (
              <Card key={req.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{req.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{req.customer_phone}</p>
                  </div>
                  <Badge variant={req.paid ? "default" : "outline"} className={req.paid ? "bg-emerald-100 text-emerald-800 text-xs" : "text-xs"}>
                    {req.paid ? "Paid" : "Unpaid"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">{req.service_name}</p>
                    <p className="text-xs text-muted-foreground">{req.branch} · {new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-semibold">
                    {req.price ? `KES ${Number(req.price).toLocaleString()}` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Select value={req.status} onValueChange={(v) => handleInlineStatus(req, v)}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <Badge className={`${STATUS_COLORS[req.status] || "bg-muted"} text-[10px]`}>
                        {req.status.replace("_", " ")}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          <Badge className={`${STATUS_COLORS[s]} text-[10px]`}>{s.replace("_", " ")}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(req)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {req.customer_phone && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => openWhatsApp(req)}>
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(req.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailReq} onOpenChange={(open) => !open && setDetailReq(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Service Request Details</DialogTitle>
            <DialogDescription>Review and update this service request.</DialogDescription>
          </DialogHeader>
          {detailReq && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> {detailReq.customer_name}</div>
                <div><span className="text-muted-foreground">Phone:</span> {detailReq.customer_phone}</div>
                <div><span className="text-muted-foreground">Service:</span> {detailReq.service_name}</div>
                <div><span className="text-muted-foreground">Branch:</span> {detailReq.branch}</div>
                <div><span className="text-muted-foreground">Price:</span> KES {detailReq.price}</div>
                <div><span className="text-muted-foreground">Payment Ref:</span> {detailReq.payment_reference || "—"}</div>
              </div>
              {detailReq.details && (
                <div>
                  <Label className="text-xs text-muted-foreground">Customer Details</Label>
                  <p className="text-sm bg-muted/50 p-2 rounded">{detailReq.details}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 flex items-end gap-2">
                  <Label className="text-xs">Paid</Label>
                  <Button
                    variant={editPaid ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditPaid(!editPaid)}
                  >
                    {editPaid ? "Yes" : "No"}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Admin Notes</Label>
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} placeholder="Internal notes..." />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDetailReq(null)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
