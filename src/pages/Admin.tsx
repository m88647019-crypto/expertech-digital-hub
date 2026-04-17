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
    <div className="min-h-screen flex w-full bg-slate-950 text-slate-100 dark">
      <Sidebar collapsible="icon">
        <SidebarContent className="bg-slate-900 border-r border-slate-800">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-bold tracking-wider text-slate-400">
              EXPERTECH ADMIN
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => {
                  if (item.adminOnly && role !== "admin") return null;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        onClick={() => selectTab(item.key)}
                        className={activeTab === item.key
                          ? "bg-primary/20 text-primary font-medium hover:bg-primary/25"
                          : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"}
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
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-3 sm:px-4 bg-slate-900">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="text-slate-200 hover:bg-slate-800">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <h1 className="text-base sm:text-lg font-bold text-slate-100 truncate">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {newJobCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative text-slate-200 hover:bg-slate-800"
                onClick={() => selectTab("jobs")}
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 min-w-4 flex items-center justify-center">
                  {newJobCount}
                </span>
              </Button>
            )}
            <span className="text-sm text-slate-400 hidden md:inline truncate max-w-[150px]">{user?.email}</span>
            <Badge variant="outline" className="text-xs capitalize hidden sm:inline-flex border-slate-700 text-slate-300">{role}</Badge>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-slate-200 hover:bg-slate-800">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto bg-slate-950">
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
