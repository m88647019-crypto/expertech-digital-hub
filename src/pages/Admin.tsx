import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Package, BarChart3, Settings, LogOut, Menu, FileText,
  Plus, Trash2, Loader2, Search, RefreshCw, Shield, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";

// ─── Types ───
interface Cashier {
  id: string;
  email: string;
  created_at: string;
  permissions: Record<string, boolean>;
}

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

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  ordersToday: number;
  topCustomers: { phone: string; count: number; total: number }[];
}

const PERMISSION_KEYS = [
  { key: "orders", label: "View Orders" },
  { key: "files", label: "Access Files" },
  { key: "delete_orders", label: "Delete Orders" },
  { key: "analytics", label: "View Analytics" },
  { key: "settings", label: "Access Settings" },
];

const NAV_ITEMS = [
  { key: "cashiers", label: "Cashiers", icon: Users },
  { key: "orders", label: "Orders", icon: Package },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "activity", label: "Activity Logs", icon: Clock },
];

// ─── Main Component ───
const Admin = () => {
  const { user, signOut, session } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("cashiers");

  const getToken = useCallback(() => session?.access_token || "", [session]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-bold tracking-wider">
                EXPERTECH ADMIN
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map((item) => (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        onClick={() => setActiveTab(item.key)}
                        className={activeTab === item.key ? "bg-primary/10 text-primary font-medium" : ""}
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
            <div className="flex items-center gap-2">
              <SidebarTrigger>
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
              <Badge variant="outline" className="text-xs">Admin</Badge>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {activeTab === "cashiers" && <CashierManagement token={getToken()} toast={toast} />}
            {activeTab === "orders" && <OrdersManagement token={getToken()} toast={toast} />}
            {activeTab === "analytics" && <AnalyticsView token={getToken()} />}
            {activeTab === "settings" && <SettingsView token={getToken()} toast={toast} />}
            {activeTab === "activity" && <ActivityLogs token={getToken()} />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

// ═══════════════════════════════════════
// CASHIER MANAGEMENT
// ═══════════════════════════════════════
function CashierManagement({ token, toast }: { token: string; toast: any }) {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [editPerms, setEditPerms] = useState<{ id: string; perms: Record<string, boolean> } | null>(null);

  const fetchCashiers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/getCashiers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCashiers(data.cashiers || []);
    } catch {
      toast({ title: "Failed to load cashiers", variant: "destructive" });
    }
    setLoading(false);
  }, [token, toast]);

  useEffect(() => { fetchCashiers(); }, [fetchCashiers]);

  const handleCreate = async () => {
    if (!newEmail || !newPassword) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/createCashier", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: newEmail, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Cashier created", description: `Invite sent to ${newEmail}` });
      setNewEmail("");
      setNewPassword("");
      setCreateOpen(false);
      fetchCashiers();
    } catch (err: any) {
      toast({ title: "Failed to create cashier", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this cashier?")) return;
    try {
      const res = await fetch("/api/admin/deleteCashier", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Cashier deleted" });
      fetchCashiers();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleUpdatePerms = async () => {
    if (!editPerms) return;
    try {
      const res = await fetch("/api/admin/updatePermissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: editPerms.id, permissions: editPerms.perms }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast({ title: "Permissions updated" });
      setEditPerms(null);
      fetchCashiers();
    } catch {
      toast({ title: "Failed to update permissions", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Cashier Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCashiers}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Cashier</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Cashier</DialogTitle>
                <DialogDescription>Create a cashier account with email and password.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="cashier@example.com" />
                </div>
                <div className="space-y-1">
                  <Label>Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : cashiers.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No cashiers yet</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashiers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(c.permissions || {}).filter(([, v]) => v).map(([k]) => (
                        <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                      ))}
                      {Object.keys(c.permissions || {}).filter((k) => c.permissions[k]).length === 0 && (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(c.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditPerms({ id: c.id, perms: { ...c.permissions } })}>
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Edit permissions dialog */}
      <Dialog open={!!editPerms} onOpenChange={(open) => !open && setEditPerms(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
            <DialogDescription>Toggle permissions for this cashier.</DialogDescription>
          </DialogHeader>
          {editPerms && (
            <div className="space-y-3">
              {PERMISSION_KEYS.map((p) => (
                <div key={p.key} className="flex items-center gap-3">
                  <Checkbox
                    checked={!!editPerms.perms[p.key]}
                    onCheckedChange={(checked) =>
                      setEditPerms({ ...editPerms, perms: { ...editPerms.perms, [p.key]: !!checked } })
                    }
                  />
                  <Label className="cursor-pointer">{p.label}</Label>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdatePerms}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════
// ORDERS MANAGEMENT
// ═══════════════════════════════════════
function OrdersManagement({ token, toast }: { token: string; toast: any }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    paid: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800",
    printed: "bg-teal-100 text-teal-800",
    completed: "bg-emerald-100 text-emerald-800",
  };

  return (
    <div className="space-y-4">
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
                      <Badge className={statusColor[o.status] || "bg-muted text-foreground"}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(o.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════
function AnalyticsView({ token }: { token: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(await res.json());
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [token]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!data) return <p className="text-muted-foreground text-center py-8">Failed to load analytics</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Analytics</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">KES {(data.totalRevenue || 0).toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Orders</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-foreground">{data.totalOrders || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Orders Today</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-accent">{data.ordersToday || 0}</p></CardContent>
        </Card>
      </div>

      {data.topCustomers && data.topCustomers.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Top Customers</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topCustomers.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono">{c.phone}</TableCell>
                    <TableCell>{c.count}</TableCell>
                    <TableCell className="font-medium">KES {c.total.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════
function SettingsView({ token, toast }: { token: string; toast: any }) {
  const [bwPrice, setBwPrice] = useState(10);
  const [colorPrice, setColorPrice] = useState(20);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("pricing_settings").select("*").limit(10);
        if (data) {
          data.forEach((row: any) => {
            if (row.key === "bw_price") setBwPrice(row.value);
            if (row.key === "color_price") setColorPrice(row.value);
          });
        }
      } catch { /* ignore */ }
      setLoaded(true);
    })();
  }, []);

  const savePricing = async () => {
    setSaving(true);
    try {
      await supabase.from("pricing_settings").upsert([
        { key: "bw_price", value: bwPrice },
        { key: "color_price", value: colorPrice },
      ], { onConflict: "key" });
      toast({ title: "Pricing updated" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
    setSaving(false);
  };

  if (!loaded) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-xl font-bold text-foreground">Settings</h2>

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Black & White (per page, KES)</Label>
            <Input type="number" value={bwPrice} onChange={(e) => setBwPrice(Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>Color (per page, KES)</Label>
            <Input type="number" value={colorPrice} onChange={(e) => setColorPrice(Number(e.target.value))} />
          </div>
          <Button onClick={savePricing} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save Pricing
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════
// ACTIVITY LOGS
// ═══════════════════════════════════════
function ActivityLogs({ token }: { token: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("activity_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        setLogs(data || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Activity Logs</h2>
      {logs.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No activity logs yet</CardContent></Card>
      ) : (
        <Card>
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.action}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{l.user_email || l.user_id}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{JSON.stringify(l.details)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default Admin;
