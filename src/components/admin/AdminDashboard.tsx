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
      <h2 className="text-xl font-bold text-foreground">Dashboard Overview</h2>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Package} label="Total Jobs" value={stats.total} color="text-primary" />
        <StatCard icon={TrendingUp} label="Today" value={stats.today} color="text-accent" />
        <StatCard icon={FileText} label="This Week" value={stats.thisWeek} color="text-blue-600" />
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="text-amber-600" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} color="text-emerald-600" />
        <StatCard icon={XCircle} label="Cancelled" value={stats.cancelled} color="text-red-600" />
      </div>

      {/* Simple bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uploads (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {stats.dailyCounts.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-foreground">{d.count}</span>
                <div
                  className="w-full bg-primary/80 rounded-t-sm min-h-[4px] transition-all"
                  style={{ height: `${(d.count / maxCount) * 100}%` }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {new Date(d.date).toLocaleDateString("en", { weekday: "short" })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent uploads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No jobs yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{job.name || "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground">{job.phone || job.email || "No contact"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[job.status as JobStatus] || "bg-muted"}>
                      {job.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
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

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col items-center text-center gap-1">
        <Icon className={`h-5 w-5 ${color}`} />
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
