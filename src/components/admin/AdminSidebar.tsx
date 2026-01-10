import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import HolocronIcon from "@/components/brand/HolocronIcon";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Palette,
  Bot,
  Brain,
  CreditCard,
  Users,
  ScrollText,
  LogOut,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Branding", url: "/admin/branding", icon: Palette },
  { title: "AI Models", url: "/admin/models", icon: Bot },
  { title: "System Behavior", url: "/admin/behavior", icon: Brain },
  { title: "Billing", url: "/admin/billing", icon: CreditCard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Activity Logs", url: "/admin/logs", icon: ScrollText },
];

const AdminSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isSuperAdmin } = useAdminAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <HolocronIcon size="md" className="shrink-0" />
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Admin</span>
              {isSuperAdmin && (
                <Badge variant="secondary" className="text-xs">
                  <Shield className="mr-1 h-3 w-3" />
                  Super
                </Badge>
              )}
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;
