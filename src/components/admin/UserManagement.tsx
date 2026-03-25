import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, RefreshCw, Shield } from "lucide-react";

interface Cashier {
  id: string;
  email: string;
  created_at: string;
  permissions: Record<string, boolean>;
}

const PERMISSION_KEYS = [
  { key: "orders", label: "View Orders" },
  { key: "files", label: "Access Files" },
  { key: "delete_orders", label: "Delete Orders" },
  { key: "analytics", label: "View Analytics" },
  { key: "settings", label: "Access Settings" },
];

export default function UserManagement({ token }: { token: string }) {
  const { toast } = useToast();
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
      toast({ title: "Failed to load users", variant: "destructive" });
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
      toast({ title: "User created", description: `Account created for ${newEmail}` });
      setNewEmail("");
      setNewPassword("");
      setCreateOpen(false);
      fetchCashiers();
    } catch (err: any) {
      toast({ title: "Failed to create user", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    try {
      const res = await fetch("/api/admin/deleteCashier", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "User deleted" });
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
        <h2 className="text-xl font-bold text-foreground">User Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCashiers}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Staff Account</DialogTitle>
                <DialogDescription>Create a new staff account with email and password.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="staff@example.com" />
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
        <Card><CardContent className="py-8 text-center text-muted-foreground">No staff users yet</CardContent></Card>
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

      <Dialog open={!!editPerms} onOpenChange={(open) => !open && setEditPerms(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
            <DialogDescription>Toggle permissions for this user.</DialogDescription>
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
