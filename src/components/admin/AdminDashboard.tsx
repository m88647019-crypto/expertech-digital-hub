import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { PrintJob } from "@/types/printJob";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Clock, CheckCircle2, XCircle, TrendingUp, Package } from "lucide-react";
import { STATUS_COLORS, type JobStatus } from "@/types/printJob";

interface Stats {
  total: number;
  today: number;
  thisWeek: number;
  pending: number;
  completed: number;
  cancelled: number;
  recentJobs: PrintJob[];
  dailyCounts: { date: string; count: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [allRes, todayRes, weekRes, pendingRes, completedRes, cancelledRes, recentRes] = await Promise.all([
        supabase.from("print_jobs").select("id", { count: "exact", head: true }),
        supabase.from("print_jobs").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
        supabase.from("print_jobs").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
        supabase.from("print_jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("print_jobs").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("print_jobs").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
        supabase.from("print_jobs").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      // Build daily counts for last 7 days
      const { data: weekJobs } = await supabase
        .from("print_jobs")
        .select("created_at")
        .gte("created_at", weekStart)
        .order("created_at", { ascending: true });

      const dailyMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        dailyMap[d.toISOString().split("T")[0]] = 0;
      }
      (weekJobs || []).forEach((j) => {
        const day = j.created_at.split("T")[0];
        if (dailyMap[day] !== undefined) dailyMap[day]++;
      });

      setStats({
        total: allRes.count || 0,
        today: todayRes.count || 0,
        thisWeek: weekRes.count || 0,
        pending: pendingRes.count || 0,
        completed: completedRes.count || 0,
        cancelled: cancelledRes.count || 0,
        recentJobs: recentRes.data || [],
        dailyCounts: Object.entries(dailyMap).map(([date, count]) => ({ date, count })),
      });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const maxCount = Math.max(...stats.dailyCounts.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100">Dashboard</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Real-time overview of your print operation.</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard icon={Package}      label="Total Jobs"  value={stats.total}      tone="primary" />
        <StatCard icon={TrendingUp}   label="Today"       value={stats.today}      tone="info" />
        <StatCard icon={FileText}     label="This Week"   value={stats.thisWeek}   tone="primary" />
        <StatCard icon={Clock}        label="Pending"     value={stats.pending}    tone="warning" />
        <StatCard icon={CheckCircle2} label="Completed"   value={stats.completed}  tone="success" />
        <StatCard icon={XCircle}      label="Cancelled"   value={stats.cancelled}  tone="danger" />
      </div>

      {/* Bar chart */}
      <Card className="admin-surface border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base text-slate-100">Uploads (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-36">
            {stats.dailyCounts.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-slate-200">{d.count}</span>
                <div
                  className="w-full rounded-t-md min-h-[4px] transition-all bg-gradient-to-t from-primary/60 to-primary"
                  style={{ height: `${(d.count / maxCount) * 100}%` }}
                />
                <span className="text-[10px] text-slate-400">
                  {new Date(d.date).toLocaleDateString("en", { weekday: "short" })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent uploads */}
      <Card className="admin-surface border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base text-slate-100">Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentJobs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No jobs yet</p>
          ) : (
            <div className="divide-y divide-[hsl(var(--admin-border))]">
              {stats.recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{job.name || "Anonymous"}</p>
                    <p className="text-xs text-slate-400 truncate">{job.phone || job.email || "No contact"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={STATUS_COLORS[job.status as JobStatus] || "bg-muted"}>
                      {job.status}
                    </Badge>
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const TONE_CLASS: Record<string, string> = {
  primary: "stat-grad-primary",
  success: "stat-grad-success",
  warning: "stat-grad-warning",
  danger:  "stat-grad-danger",
  info:    "stat-grad-info",
};
const TONE_ICON: Record<string, string> = {
  primary: "text-sky-300",
  success: "text-emerald-300",
  warning: "text-amber-300",
  danger:  "text-rose-300",
  info:    "text-violet-300",
};

function StatCard({ icon: Icon, label, value, tone = "primary" }: { icon: any; label: string; value: number | string; tone?: string }) {
  return (
    <div className={`stat-card ${TONE_CLASS[tone]}`}>
      <div className="flex items-center justify-between">
        <Icon className={`h-5 w-5 ${TONE_ICON[tone]}`} />
        <span className="text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-50 tabular-nums">{value}</p>
    </div>
  );
}
