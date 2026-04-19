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
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard icon={Package}      label="Total Jobs"  value={stats.total}      tone="primary" />
        <StatCard icon={TrendingUp}   label="Today"       value={stats.today}      tone="info" />
        <StatCard icon={FileText}     label="This Week"   value={stats.thisWeek}   tone="primary" />
        <StatCard icon={Clock}        label="Pending"     value={stats.pending}    tone="warning" />
        <StatCard icon={CheckCircle2} label="Completed"   value={stats.completed}  tone="success" />
        <StatCard icon={XCircle}      label="Cancelled"   value={stats.cancelled}  tone="danger" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Bar chart */}
        <Card className="admin-surface border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base admin-text flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Uploads (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-36">
              {stats.dailyCounts.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium admin-text">{d.count}</span>
                  <div
                    className="w-full rounded-t-md min-h-[4px] transition-all bg-primary/80"
                    style={{ height: `${(d.count / maxCount) * 100}%` }}
                  />
                  <span className="text-[10px] admin-muted">
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
            <CardTitle className="text-sm sm:text-base admin-text flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentJobs.length === 0 ? (
              <p className="text-sm admin-muted text-center py-6">
                No activity yet. Add a service or wait for the first upload to get started.
              </p>
            ) : (
              <div className="divide-y divide-[hsl(var(--admin-border))]">
                {stats.recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium admin-text truncate">{job.name || "Anonymous"}</p>
                      <p className="text-xs admin-muted truncate">{job.phone || job.email || "No contact"}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={STATUS_COLORS[job.status as JobStatus] || "bg-muted"}>
                        {job.status}
                      </Badge>
                      <span className="text-xs admin-muted hidden sm:inline">
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

function StatCard({ icon: Icon, label, value, tone = "primary" }: { icon: any; label: string; value: number | string; tone?: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center justify-center h-9 w-9 rounded-lg ${TONE_CLASS[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[10px] uppercase tracking-wider admin-muted text-right leading-tight">{label}</span>
      </div>
      <p className="mt-3 text-2xl sm:text-3xl font-bold admin-text tabular-nums">{value}</p>
    </div>
  );
}
