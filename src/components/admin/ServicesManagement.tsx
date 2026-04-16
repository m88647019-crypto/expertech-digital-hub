import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useServiceCategories, useServicesAdmin } from "@/hooks/useServices";
import type { Service, ServiceCategory } from "@/hooks/useServices";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Loader2, Edit, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const db = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

export default function ServicesManagement() {
  const { categories, loading: catLoading, refetch: refetchCats } = useServiceCategories();
  const { services, loading: svcLoading, refetch: refetchSvcs } = useServicesAdmin();

  const [catDialog, setCatDialog] = useState(false);
  const [editCat, setEditCat] = useState<ServiceCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("FileText");

  const [svcDialog, setSvcDialog] = useState(false);
  const [editSvc, setEditSvc] = useState<Service | null>(null);
  const [svcName, setSvcName] = useState("");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcPrice, setSvcPrice] = useState("0");
  const [svcTiming, setSvcTiming] = useState<"pay_first" | "pay_after">("pay_after");
  const [svcCatId, setSvcCatId] = useState("");
  const [svcRequiresDetails, setSvcRequiresDetails] = useState(false);
  const [svcDetailHint, setSvcDetailHint] = useState("");
  const [saving, setSaving] = useState(false);

  const openCatDialog = (cat?: ServiceCategory) => {
    if (cat) {
      setEditCat(cat);
      setCatName(cat.name);
      setCatIcon(cat.icon);
    } else {
      setEditCat(null);
      setCatName("");
      setCatIcon("FileText");
    }
    setCatDialog(true);
  };

  const saveCat = async () => {
    if (!catName.trim()) return;
    setSaving(true);
    if (editCat) {
      await db.from("service_categories").update({ name: catName, icon: catIcon }).eq("id", editCat.id);
    } else {
      await db.from("service_categories").insert({ name: catName, icon: catIcon, sort_order: categories.length });
    }
    setCatDialog(false);
    refetchCats();
    setSaving(false);
    toast.success(editCat ? "Category updated" : "Category created");
  };

  const toggleCatActive = async (cat: ServiceCategory) => {
    await db.from("service_categories").update({ is_active: !cat.is_active }).eq("id", cat.id);
    refetchCats();
  };

  const deleteCat = async (id: string) => {
    if (!confirm("Delete this category? Services in it will be uncategorized.")) return;
    await db.from("service_categories").delete().eq("id", id);
    refetchCats();
    toast.success("Category deleted");
  };

  const openSvcDialog = (svc?: Service) => {
    if (svc) {
      setEditSvc(svc);
      setSvcName(svc.name);
      setSvcDesc(svc.description || "");
      setSvcPrice(svc.price?.toString() || "0");
      setSvcTiming(svc.payment_timing);
      setSvcCatId(svc.category_id || "");
      setSvcRequiresDetails(svc.requires_details || false);
      setSvcDetailHint(svc.detail_hint || "");
    } else {
      setEditSvc(null);
      setSvcName("");
      setSvcDesc("");
      setSvcPrice("0");
      setSvcTiming("pay_after");
      setSvcCatId(categories[0]?.id || "");
      setSvcRequiresDetails(false);
      setSvcDetailHint("");
    }
    setSvcDialog(true);
  };

  const saveSvc = async () => {
    if (!svcName.trim()) return;
    setSaving(true);
    const payload = {
      name: svcName,
      description: svcDesc || null,
      price: parseFloat(svcPrice) || 0,
      payment_timing: svcTiming,
      category_id: svcCatId || null,
      requires_details: svcRequiresDetails,
      detail_hint: svcDetailHint || null,
    };
    if (editSvc) {
      await db.from("services").update(payload).eq("id", editSvc.id);
    } else {
      await db.from("services").insert({ ...payload, sort_order: services.length });
    }
    setSvcDialog(false);
    refetchSvcs();
    setSaving(false);
    toast.success(editSvc ? "Service updated" : "Service created");
  };

  const toggleSvcActive = async (svc: Service) => {
    await db.from("services").update({ is_active: !svc.is_active }).eq("id", svc.id);
    refetchSvcs();
  };

  const deleteSvc = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    await db.from("services").delete().eq("id", id);
    refetchSvcs();
    toast.success("Service deleted");
  };

  const getCatName = (catId: string | null) => categories.find((c) => c.id === catId)?.name || "—";

  if (catLoading || svcLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Services Management</h2>

      <Tabs defaultValue="services">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => openSvcDialog()}>
              <Plus className="h-4 w-4 mr-1" /> Add Service
            </Button>
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price (KES)</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Details?</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((svc) => (
                    <TableRow key={svc.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{svc.name}</p>
                        {svc.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{svc.description}</p>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{getCatName(svc.category_id)}</TableCell>
                      <TableCell className="font-medium">{svc.price}</TableCell>
                      <TableCell>
                        <Badge variant={svc.payment_timing === "pay_first" ? "default" : "outline"} className="text-xs">
                          {svc.payment_timing === "pay_first" ? "Pay First" : "Pay After"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {svc.requires_details ? (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Yes</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch checked={svc.is_active} onCheckedChange={() => toggleSvcActive(svc)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openSvcDialog(svc)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSvc(svc.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {services.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No services yet. Add your first service above.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {services.map((svc) => (
              <Card key={svc.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{svc.name}</p>
                    <p className="text-xs text-muted-foreground">{getCatName(svc.category_id)}</p>
                  </div>
                  <Switch checked={svc.is_active} onCheckedChange={() => toggleSvcActive(svc)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">KES {svc.price}</Badge>
                  <Badge variant={svc.payment_timing === "pay_first" ? "default" : "outline"} className="text-xs">
                    {svc.payment_timing === "pay_first" ? "Pay First" : "Pay After"}
                  </Badge>
                  {svc.requires_details && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Details Required</Badge>
                  )}
                </div>
                <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => openSvcDialog(svc)}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteSvc(svc.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </Card>
            ))}
            {services.length === 0 && (
              <Card className="p-8 text-center text-muted-foreground">No services yet.</Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => openCatDialog()}>
              <FolderPlus className="h-4 w-4 mr-1" /> Add Category
            </Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-muted-foreground">{services.filter((s) => s.category_id === cat.id).length}</TableCell>
                      <TableCell>
                        <Switch checked={cat.is_active} onCheckedChange={() => toggleCatActive(cat)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCatDialog(cat)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCat(cat.id)}>
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
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCat ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>{editCat ? "Update category details." : "Create a new service category."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Government Portals" />
            </div>
            <div className="space-y-1">
              <Label>Icon Name</Label>
              <Input value={catIcon} onChange={(e) => setCatIcon(e.target.value)} placeholder="e.g. Landmark, FileText" />
              <p className="text-xs text-muted-foreground">Lucide icon name for public site display</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCatDialog(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={saveCat} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Dialog */}
      <Dialog open={svcDialog} onOpenChange={setSvcDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editSvc ? "Edit Service" : "Add Service"}</DialogTitle>
            <DialogDescription>{editSvc ? "Update service details and pricing." : "Create a new service offering."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Service Name</Label>
              <Input value={svcName} onChange={(e) => setSvcName(e.target.value)} placeholder="e.g. KRA iTax Services" />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Input value={svcDesc} onChange={(e) => setSvcDesc(e.target.value)} placeholder="Brief description" />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={svcCatId} onValueChange={setSvcCatId}>
                <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Price (KES)</Label>
                <Input type="number" value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Payment Timing</Label>
                <Select value={svcTiming} onValueChange={(v) => setSvcTiming(v as "pay_first" | "pay_after")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pay_first">Pay First (M-Pesa)</SelectItem>
                    <SelectItem value="pay_after">Pay After Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Requires Customer Details</Label>
                  <p className="text-xs text-muted-foreground">Toggle if this service needs specific info from the customer</p>
                </div>
                <Switch checked={svcRequiresDetails} onCheckedChange={setSvcRequiresDetails} />
              </div>
              {svcRequiresDetails && (
                <div className="space-y-1">
                  <Label>Detail Hint (shown to customer)</Label>
                  <Input
                    value={svcDetailHint}
                    onChange={(e) => setSvcDetailHint(e.target.value)}
                    placeholder="e.g. Please provide your KRA PIN"
                  />
                  <p className="text-xs text-muted-foreground">
                    This hint helps customers know what info to provide. If they don't have it, your team will contact them.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSvcDialog(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={saveSvc} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
