import { useParams } from "react-router-dom";
import AppSidebar from "@/components/layout/AppSidebar";
import ChatContainer from "@/components/chat/ChatContainer";
import PreviewPanel from "@/components/preview/PreviewPanel";
import TeamSidebar from "@/components/team/TeamSidebar";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useOrganization } from "@/hooks/useOrganization";

const Project = () => {
  const { id } = useParams();
  const { organization } = useOrganization();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        
        <main className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b border-border px-4">
            <div className="flex items-center">
              <SidebarTrigger />
              <span className="ml-3 text-sm font-medium text-foreground">
                marketing-site
              </span>
              <span className="ml-2 text-sm text-muted-foreground">main</span>
            </div>
            <NotificationDropdown />
          </header>

          <div className="flex flex-1 overflow-hidden">
            <div className="flex w-1/2 flex-col border-r border-border">
              <ChatContainer />
            </div>
            <div className="flex w-1/2 flex-col">
              <PreviewPanel />
            </div>
            <TeamSidebar organizationId={organization?.id || null} />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Project;
