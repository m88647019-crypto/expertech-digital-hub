import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Package, LogOut, Loader2, Search, RefreshCw, FileText, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Order {
  id: string;
  checkout_request_id: string;
  phone: string;
  amount: number;
  receipt: string;
  status: string;
  created_at: string;
  files?: string[];
}

const STATUS_OPTIONS = ["pending", "paid", "processing", "printed", "completed"];

const Dashboard = () => {
  const { user, signOut, session, hasPermission } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const token = session?.access_token || "";

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      toast({ title: "Failed to load orders", variant: "destructive" });
    }
    setLoading(false);
  }, [token, search, toast]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("cashier-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);
      if (error) throw error;
      toast({ title: `Order status updated to ${newStatus}` });
      fetchOrders();
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const getSignedUrl = async (filePath: string) => {
    try {
      const res = await fetch(`/api/admin/files?path=${encodeURIComponent(filePath)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
    } catch {
      toast({ title: "Failed to get file link", variant: "destructive" });
    }
  };

  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    paid: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800",
    printed: "bg-teal-100 text-teal-800",
    completed: "bg-emerald-100 text-emerald-800",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
        <h1 className="text-lg font-bold text-foreground">
          EXPERTECH<span className="text-accent">.</span> Dashboard
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
          <Badge variant="outline" className="text-xs">Cashier</Badge>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Orders</h2>
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by phone, receipt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : orders.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No orders found</CardContent></Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-sm">{o.phone}</TableCell>
                      <TableCell className="font-medium">KES {o.amount}</TableCell>
                      <TableCell className="font-mono text-xs">{o.receipt || "—"}</TableCell>
                      <TableCell>
                        {hasPermission("orders") ? (
                          <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={statusColor[o.status] || "bg-muted text-foreground"}>{o.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {o.files && o.files.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {o.files.map((f, i) => (
                              <Button
                                key={i}
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => getSignedUrl(f)}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                File {i + 1}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {new Date(o.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
