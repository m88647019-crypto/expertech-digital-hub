import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import {
  LayoutDashboard, FileText, Users, Settings, LogOut, Menu, Clock, Bell, Briefcase, ClipboardList, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import AdminDashboard from "@/components/admin/AdminDashboard";
import PrintJobsTable from "@/components/admin/PrintJobsTable";
import UserManagement from "@/components/admin/UserManagement";
import AdminSettings from "@/components/admin/AdminSettings";
import ActivityLogs from "@/components/admin/ActivityLogs";
import ServicesManagement from "@/components/admin/ServicesManagement";
import ServiceRequestsTable from "@/components/admin/ServiceRequestsTable";
import ReportsPanel from "@/components/admin/ReportsPanel";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "jobs", label: "Print Jobs", icon: FileText },
  { key: "service-requests", label: "Service Requests", icon: ClipboardList },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "services", label: "Manage Services", icon: Briefcase, adminOnly: true },
  { key: "users", label: "Users", icon: Users, adminOnly: true },
  { key: "settings", label: "Settings", icon: Settings, adminOnly: true },
  { key: "activity", label: "Activity Logs", icon: Clock },
];

const AdminInner = () => {
  const { user, signOut, session, role } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [newJobCount, setNewJobCount] = useState(0);

  const getToken = useCallback(() => session?.access_token || "", [session]);

  const selectTab = useCallback((key: string) => {
    setActiveTab(key);
    if (key === "jobs") setNewJobCount(0);
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "print_jobs" }, () => {
        setNewJobCount((c) => c + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen flex w-full admin-shell text-slate-100 dark">
      <Sidebar collapsible="icon">
        <SidebarContent className="bg-[hsl(var(--admin-surface))] border-r border-[hsl(var(--admin-border))]">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-bold tracking-[0.18em] text-slate-400 px-3 pt-3">
              <span className="admin-brand-text">EXPERTECH</span>
              <span className="text-slate-500"> · ADMIN</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => {
                  if (item.adminOnly && role !== "admin") return null;
                  const isActive = activeTab === item.key;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        onClick={() => selectTab(item.key)}
                        className={
                          isActive
                            ? "relative bg-gradient-to-r from-primary/25 to-primary/5 text-primary font-semibold hover:from-primary/30 hover:to-primary/10 before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-r-full before:bg-primary"
                            : "text-slate-300 hover:bg-[hsl(var(--admin-surface-2))] hover:text-slate-100"
                        }
                      >
                        <item.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {item.key === "jobs" && newJobCount > 0 && (
                          <Badge className="ml-auto bg-destructive text-destructive-foreground text-[10px] h-5 min-w-5 flex items-center justify-center">
                            {newJobCount}
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 admin-header flex items-center justify-between px-3 sm:px-5">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="text-slate-200 hover:bg-[hsl(var(--admin-surface-2))]">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <h1 className="text-base sm:text-lg font-bold truncate">
              <span className="admin-brand-text">Admin</span>
              <span className="text-slate-300"> Panel</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {newJobCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative text-slate-200 hover:bg-[hsl(var(--admin-surface-2))]"
                onClick={() => selectTab("jobs")}
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 min-w-4 flex items-center justify-center">
                  {newJobCount}
                </span>
              </Button>
            )}
            <span className="text-xs sm:text-sm text-slate-400 hidden md:inline truncate max-w-[150px]">{user?.email}</span>
            <Badge variant="outline" className="text-[10px] capitalize hidden sm:inline-flex border-[hsl(var(--admin-border))] text-slate-300 bg-[hsl(var(--admin-surface))]">
              {role}
            </Badge>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-slate-200 hover:bg-[hsl(var(--admin-surface-2))]">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-5 md:p-6 overflow-auto">
          {activeTab === "dashboard" && <AdminDashboard />}
          {activeTab === "jobs" && <PrintJobsTable />}
          {activeTab === "service-requests" && <ServiceRequestsTable />}
          {activeTab === "reports" && <ReportsPanel />}
          {activeTab === "services" && <ServicesManagement />}
          {activeTab === "users" && <UserManagement token={getToken()} />}
          {activeTab === "settings" && <AdminSettings />}
          {activeTab === "activity" && <ActivityLogs />}
        </main>
      </div>
    </div>
  );
};

const Admin = () => (
  <SidebarProvider>
    <AdminInner />
  </SidebarProvider>
);

export default Admin;
