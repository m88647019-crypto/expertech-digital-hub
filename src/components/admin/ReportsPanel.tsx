import { useEffect, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Loader2, TrendingUp, DollarSign, Users, FileText, ClipboardList,
  CheckCircle2, Clock, XCircle, BarChart3, RefreshCw,
} from "lucide-react";

const db = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

interface ServiceRequest {
  id: string;
  service_name: string;
  customer_name: string;
  status: string;
  price: number;
  paid: boolean;
  created_at: string;
  branch: string;
  discount_amount?: number;
  discount_approved?: boolean;
}

const netOf = (r: ServiceRequest) =>
  Math.max(0, (Number(r.price) || 0) - (r.discount_approved ? Number(r.discount_amount || 0) : 0));

interface PrintJob {
  id: string;
  status: string;
  created_at: string;
  name?: string;
}

export default function ReportsPanel() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7");

  const fetchData = async () => {
    setLoading(true);
    const since = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString();

    const [reqRes, jobRes] = await Promise.all([
      db.from("service_requests").select("*").gte("created_at", since).order("created_at", { ascending: false }),
      supabase.from("print_jobs").select("*").gte("created_at", since).order("created_at", { ascending: false }),
    ]);

    setRequests(reqRes.data || []);
    setPrintJobs(jobRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [period]);

  const stats = useMemo(() => {
    const totalRequests = requests.length;
    const totalJobs = printJobs.length;
    const totalRevenue = requests.filter((r) => r.paid).reduce((s, r) => s + netOf(r), 0);
    const pendingRevenue = requests.filter((r) => !r.paid).reduce((s, r) => s + netOf(r), 0);
    const totalDiscounts = requests
      .filter((r) => r.discount_approved && (r.discount_amount || 0) > 0)
      .reduce((s, r) => s + Number(r.discount_amount || 0), 0);
    const completedRequests = requests.filter((r) => r.status === "completed").length;
    const pendingRequests = requests.filter((r) => r.status === "pending").length;
    const cancelledRequests = requests.filter((r) => r.status === "cancelled").length;
    const uniqueCustomers = new Set(requests.map((r) => r.customer_name.toLowerCase())).size;

    // Service popularity
    const svcCounts: Record<string, { count: number; revenue: number; paid: number }> = {};
    requests.forEach((r) => {
      if (!svcCounts[r.service_name]) svcCounts[r.service_name] = { count: 0, revenue: 0, paid: 0 };
      svcCounts[r.service_name].count++;
      svcCounts[r.service_name].revenue += netOf(r);
      if (r.paid) svcCounts[r.service_name].paid += netOf(r);
    });
    const popularServices = Object.entries(svcCounts)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.count - a.count);

    // Branch breakdown
    const branchCounts: Record<string, number> = {};
    requests.forEach((r) => {
      branchCounts[r.branch || "unknown"] = (branchCounts[r.branch || "unknown"] || 0) + 1;
    });

    // Daily trend
    const dailyMap: Record<string, { requests: number; jobs: number }> = {};
    const days = parseInt(period);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      dailyMap[d] = { requests: 0, jobs: 0 };
    }
    requests.forEach((r) => {
      const d = r.created_at.split("T")[0];
      if (dailyMap[d]) dailyMap[d].requests++;
    });
    printJobs.forEach((j) => {
      const d = j.created_at.split("T")[0];
      if (dailyMap[d]) dailyMap[d].jobs++;
    });
    const dailyTrend = Object.entries(dailyMap).map(([date, d]) => ({ date, ...d }));

    return {
      totalRequests, totalJobs, totalRevenue, pendingRevenue, totalDiscounts,
      completedRequests, pendingRequests, cancelledRequests,
      uniqueCustomers, popularServices, branchCounts, dailyTrend,
    };
  }, [requests, printJobs, period]);

  const maxDaily = Math.max(...stats.dailyTrend.map((d) => d.requests + d.jobs), 1);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold admin-text">Reports & Analytics</h2>
          <p className="text-xs sm:text-sm admin-muted mt-1">Track performance, revenue and customer activity.</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={ClipboardList} label="Service Requests" value={stats.totalRequests} tone="primary" />
        <StatCard icon={FileText} label="Print Jobs" value={stats.totalJobs} tone="info" />
        <StatCard icon={DollarSign} label="Revenue (Paid)" value={`KES ${stats.totalRevenue.toLocaleString()}`} tone="success" />
        <StatCard icon={DollarSign} label="Pending Revenue" value={`KES ${stats.pendingRevenue.toLocaleString()}`} tone="warning" />
      </div>

      {stats.totalDiscounts > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <StatCard icon={DollarSign} label="Discounts Applied" value={`KES ${stats.totalDiscounts.toLocaleString()}`} tone="info" />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completedRequests} tone="success" />
        <StatCard icon={Clock} label="Pending" value={stats.pendingRequests} tone="warning" />
        <StatCard icon={XCircle} label="Cancelled" value={stats.cancelledRequests} tone="danger" />
        <StatCard icon={Users} label="Unique Customers" value={stats.uniqueCustomers} tone="info" />
      </div>

      {/* Daily trend chart */}
      <Card className="admin-surface border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2 admin-text">
            <BarChart3 className="h-4 w-4 text-primary" /> Daily Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-36 overflow-x-auto pb-1">
            {stats.dailyTrend.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-0.5 min-w-[28px] flex-1">
                <span className="text-[10px] font-medium admin-text">{d.requests + d.jobs}</span>
                <div className="w-full flex flex-col gap-px" style={{ height: `${((d.requests + d.jobs) / maxDaily) * 100}%`, minHeight: 4 }}>
                  <div className="flex-1 rounded-t-sm bg-primary" style={{ flex: d.requests }} />
                  {d.jobs > 0 && <div className="rounded-b-sm bg-primary/40" style={{ flex: d.jobs }} />}
                </div>
                <span className="text-[9px] admin-muted whitespace-nowrap">
                  {new Date(d.date).toLocaleDateString("en", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-xs admin-muted">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-primary rounded-sm" /> Requests</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-primary/40 rounded-sm" /> Print Jobs</span>
          </div>
        </CardContent>
      </Card>

      {/* Popular services & Branch split */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="admin-surface border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2 admin-text">
              <TrendingUp className="h-4 w-4 text-primary" /> Popular Services
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.popularServices.slice(0, 10).map((s) => (
                    <TableRow key={s.name}>
                      <TableCell className="text-sm font-medium admin-text">{s.name}</TableCell>
                      <TableCell className="text-right admin-text">{s.count}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell admin-muted">
                        KES {s.revenue.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {stats.popularServices.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center admin-muted py-6">No data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-surface border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base admin-text">Branch Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.branchCounts).length === 0 ? (
              <p className="text-sm admin-muted text-center py-6">No data</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.branchCounts).map(([branch, count]) => {
                  const pct = stats.totalRequests > 0 ? Math.round((count / stats.totalRequests) * 100) : 0;
                  return (
                    <div key={branch}>
                      <div className="flex justify-between text-sm mb-1 admin-text">
                        <span className="capitalize font-medium">{branch}</span>
                        <span className="admin-muted">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-[hsl(var(--admin-surface-2))] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const TONE_CLASS: Record<string, string> = {
  primary: "tone-primary",
  success: "tone-success",
  warning: "tone-warning",
  danger:  "tone-danger",
  info:    "tone-info",
};

function StatCard({ icon: Icon, label, value, tone = "primary" }: { icon: any; label: string; value: string | number; tone?: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center justify-center h-9 w-9 rounded-lg ${TONE_CLASS[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[10px] uppercase tracking-wider admin-muted text-right leading-tight">{label}</span>
      </div>
      <p className="mt-3 text-base sm:text-2xl font-bold admin-text tabular-nums">{value}</p>
    </div>
  );
}

