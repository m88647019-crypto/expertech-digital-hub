import { useState } from "react";
import { usePrintJobs } from "@/hooks/usePrintJobs";
import { useToast } from "@/hooks/use-toast";
import type { PrintJob, JobStatus } from "@/types/printJob";
import { JOB_STATUSES, STATUS_COLORS, PAYMENT_METHODS } from "@/types/printJob";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, RefreshCw, Loader2, Trash2, Download, Eye, MessageCircle, Mail,
  CheckCircle2, X, Filter
} from "lucide-react";
import JobDetailModal from "./JobDetailModal";

export default function PrintJobsTable() {
  const { jobs, loading, filters, setFilters, fetchJobs, updateJob, deleteJob, deleteJobs, bulkUpdateStatus } = usePrintJobs();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailJob, setDetailJob] = useState<PrintJob | null>(null);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === jobs.length) setSelected(new Set());
    else setSelected(new Set(jobs.map((j) => j.id)));
  };

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await updateJob(id, { status: status as JobStatus });
    if (error) toast({ title: "Failed to update status", variant: "destructive" });
    else toast({ title: `Status updated to ${status}` });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this job?")) return;
    const { error } = await deleteJob(id);
    if (error) toast({ title: "Failed to delete", variant: "destructive" });
    else toast({ title: "Job deleted" });
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} job(s)?`)) return;
    const { error } = await deleteJobs(Array.from(selected));
    if (!error) { setSelected(new Set()); toast({ title: `${selected.size} jobs deleted` }); }
  };

  const handleBulkComplete = async () => {
    if (selected.size === 0) return;
    const { error } = await bulkUpdateStatus(Array.from(selected), "completed");
    if (!error) { setSelected(new Set()); toast({ title: `${selected.size} jobs marked completed` }); }
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Status", "Copies", "Color", "Paper", "Price", "Paid", "Branch", "Date"];
    const rows = jobs.map((j) => [
      j.name, j.email, j.phone, j.status, j.copies, j.color_option, j.paper_size,
      j.price, j.paid ? "Yes" : "No", j.branch, new Date(j.created_at).toLocaleString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `print-jobs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openWhatsApp = (job: PrintJob) => {
    const msg = encodeURIComponent(
      `Hello ${job.name || "Customer"}, your document "${job.file_url?.split("/").pop() || "file"}" is ready for pickup at Expertech Digital Hub.`
    );
    window.open(`https://wa.me/${job.phone?.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
  };

  const openEmail = (job: PrintJob) => {
    const subject = encodeURIComponent("Your Print Job - Expertech Digital Hub");
    const body = encodeURIComponent(
      `Hello ${job.name || "Customer"},\n\nYour print job is ready for pickup.\n\nRegards,\nExpertech Digital Hub`
    );
    window.open(`mailto:${job.email}?subject=${subject}&body=${body}`, "_blank");
  };

  const branches = Array.from(new Set(jobs.map((j) => j.branch).filter(Boolean)));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">Print Jobs</h2>
        <div className="flex flex-wrap gap-2">
          {selected.size > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handleBulkComplete}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Complete ({selected.size})
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete ({selected.size})
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchJobs}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
          <SelectTrigger className="w-36">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {JOB_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {branches.length > 0 && (
          <Select value={filters.branch} onValueChange={(v) => setFilters({ ...filters, branch: v })}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b} value={b!}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          className="w-36"
          placeholder="From"
        />
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          className="w-36"
          placeholder="To"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : jobs.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No print jobs found</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selected.size === jobs.length && jobs.length > 0} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Print</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className={selected.has(job.id) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox checked={selected.has(job.id)} onCheckedChange={() => toggleSelect(job.id)} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">{job.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{job.phone || job.email || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={job.status} onValueChange={(v) => handleStatusChange(job.id, v)}>
                        <SelectTrigger className="h-7 w-28 border-0 p-0">
                          <Badge className={STATUS_COLORS[job.status as JobStatus] || "bg-muted"}>
                            {job.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {JOB_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        <span>{job.copies}x {job.color_option === "color" ? "Color" : "B&W"}</span>
                        <br />
                        <span>{job.paper_size}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {job.price ? `KES ${Number(job.price).toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={job.paid ? "default" : "outline"} className={job.paid ? "bg-emerald-100 text-emerald-800" : ""}>
                        {job.paid ? "Paid" : "Unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{job.branch || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(job.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailJob(job)} title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {job.phone && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => openWhatsApp(job)} title="WhatsApp">
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {job.email && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => openEmail(job)} title="Email">
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(job.id)} title="Delete">
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
      )}

      {detailJob && (
        <JobDetailModal
          job={detailJob}
          onClose={() => setDetailJob(null)}
          onUpdate={async (updates) => {
            await updateJob(detailJob.id, updates);
            setDetailJob(null);
          }}
        />
      )}
    </div>
  );
}
