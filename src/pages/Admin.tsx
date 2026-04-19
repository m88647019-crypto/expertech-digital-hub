import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminTheme } from "@/hooks/useAdminTheme";
import { supabase } from "@/lib/supabaseClient";
import {
  LayoutDashboard, FileText, Users, Settings, LogOut, Menu, Clock, Bell,
  Briefcase, ClipboardList, BarChart3, Sun, Moon, Hand, ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
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
import TermsEditor from "@/components/admin/TermsEditor";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "jobs", label: "Print Jobs", icon: FileText },
  { key: "service-requests", label: "Service Requests", icon: ClipboardList },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "services", label: "Manage Services", icon: Briefcase, adminOnly: true },
  { key: "users", label: "Users", icon: Users, adminOnly: true },
  { key: "settings", label: "Settings", icon: Settings, adminOnly: true },
  { key: "terms", label: "Terms of Service", icon: ScrollText, adminOnly: true },
  { key: "activity", label: "Activity Logs", icon: Clock },
];

const TAB_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  jobs: "Print Jobs",
  "service-requests": "Service Requests",
  reports: "Reports",
  services: "Manage Services",
  users: "Users",
  settings: "Settings",
  terms: "Terms of Service",
  activity: "Activity Logs",
};

const AdminInner = () => {
  const { user, signOut, session, role } = useAuth();
  const { theme, toggle: toggleTheme } = useAdminTheme();
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

  const firstName = (user?.email || "").split("@")[0];

  return (
    <div className="min-h-screen flex w-full admin-shell">
      <Sidebar collapsible="icon">
        <SidebarContent className="admin-sidebar-bg">
          {/* Brand block */}
          <div className="px-4 pt-5 pb-4 border-b border-[hsl(var(--admin-border))]">
            <p className="font-bold text-base admin-text leading-tight">EXPERTECH</p>
            <p className="text-xs admin-muted leading-tight mt-0.5">Admin Console</p>
          </div>

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5 px-2 pt-3">
                {NAV_ITEMS.map((item) => {
                  if (item.adminOnly && role !== "admin") return null;
                  const isActive = activeTab === item.key;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        onClick={() => selectTab(item.key)}
                        className={
                          isActive
                            ? "bg-[hsl(var(--admin-sidebar-active))] text-[hsl(var(--admin-sidebar-active-fg))] hover:bg-[hsl(var(--admin-sidebar-active))] hover:text-[hsl(var(--admin-sidebar-active-fg))] font-medium rounded-lg"
                            : "admin-text-soft hover:bg-[hsl(var(--admin-surface-2))] hover:admin-text rounded-lg"
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

          {/* Footer (user identity + sign out) */}
          <div className="mt-auto px-3 py-4 border-t border-[hsl(var(--admin-border))] space-y-2">
            <p className="text-xs admin-muted truncate px-1" title={user?.email || ""}>
              {user?.email}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start admin-text-soft hover:bg-[hsl(var(--admin-surface-2))] hover:admin-text"
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </SidebarContent>
      </Sidebar>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 admin-header flex items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="admin-text hover:bg-[hsl(var(--admin-surface-2))]">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <h1 className="text-base sm:text-lg font-semibold truncate admin-text">
              {TAB_TITLES[activeTab]}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {newJobCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="relative admin-text hover:bg-[hsl(var(--admin-surface-2))]"
                onClick={() => selectTab("jobs")}
                title={`${newJobCount} new print job${newJobCount > 1 ? "s" : ""}`}
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                  {newJobCount}
                </span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="admin-text hover:bg-[hsl(var(--admin-surface-2))]"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Badge variant="outline" className="text-[10px] capitalize hidden sm:inline-flex border-[hsl(var(--admin-border))] admin-text-soft bg-[hsl(var(--admin-surface))]">
              {role}
            </Badge>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
          {/* Welcome line on dashboard tab only */}
          {activeTab === "dashboard" && (
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold admin-text flex items-center gap-2">
                Welcome back, <span className="capitalize">{firstName}</span>
                <Hand className="h-6 w-6 text-amber-500" />
              </h2>
              <p className="text-sm admin-muted mt-1">
                Here's an overview of your business today.
              </p>
            </div>
          )}

          {activeTab === "dashboard" && <AdminDashboard />}
          {activeTab === "jobs" && <PrintJobsTable />}
          {activeTab === "service-requests" && <ServiceRequestsTable />}
          {activeTab === "reports" && <ReportsPanel />}
          {activeTab === "services" && <ServicesManagement />}
          {activeTab === "users" && <UserManagement token={getToken()} />}
          {activeTab === "settings" && <AdminSettings />}
          {activeTab === "terms" && <TermsEditor />}
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
