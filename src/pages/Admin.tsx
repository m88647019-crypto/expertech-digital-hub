import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import {
  LayoutDashboard, FileText, Users, Settings, LogOut, Menu, Clock, Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import AdminDashboard from "@/components/admin/AdminDashboard";
import PrintJobsTable from "@/components/admin/PrintJobsTable";
import UserManagement from "@/components/admin/UserManagement";
import AdminSettings from "@/components/admin/AdminSettings";
import ActivityLogs from "@/components/admin/ActivityLogs";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "jobs", label: "Print Jobs", icon: FileText },
  { key: "users", label: "Users", icon: Users },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "activity", label: "Activity Logs", icon: Clock },
];

const Admin = () => {
  const { user, signOut, session, role } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [newJobCount, setNewJobCount] = useState(0);

  const getToken = useCallback(() => session?.access_token || "", [session]);

  // Realtime notification for new jobs
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
                  {NAV_ITEMS.map((item) => {
                    // Hide user management for non-admins
                    if (item.key === "users" && role !== "admin") return null;
                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          onClick={() => {
                            setActiveTab(item.key);
                            if (item.key === "jobs") setNewJobCount(0);
                          }}
                          className={activeTab === item.key ? "bg-primary/10 text-primary font-medium" : ""}
                        >
                          <item.icon className="h-4 w-4 mr-2" />
                          <span>{item.label}</span>
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

        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
            <div className="flex items-center gap-2">
              <SidebarTrigger>
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-3">
              {newJobCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative"
                  onClick={() => { setActiveTab("jobs"); setNewJobCount(0); }}
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 min-w-4 flex items-center justify-center">
                    {newJobCount}
                  </span>
                </Button>
              )}
              <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
              <Badge variant="outline" className="text-xs capitalize">{role}</Badge>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {activeTab === "dashboard" && <AdminDashboard />}
            {activeTab === "jobs" && <PrintJobsTable />}
            {activeTab === "users" && <UserManagement token={getToken()} />}
            {activeTab === "settings" && <AdminSettings />}
            {activeTab === "activity" && <ActivityLogs />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
