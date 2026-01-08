import { useParams } from "react-router-dom";
import AppSidebar from "@/components/layout/AppSidebar";
import ChatContainer from "@/components/chat/ChatContainer";
import PreviewPanel from "@/components/preview/PreviewPanel";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Project = () => {
  const { id } = useParams();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        
        <main className="flex flex-1 flex-col">
          {/* Header */}
          <header className="flex h-14 items-center border-b border-border px-4">
            <SidebarTrigger />
            <span className="ml-3 text-sm font-medium text-foreground">
              marketing-site
            </span>
            <span className="ml-2 text-sm text-muted-foreground">
              main
            </span>
          </header>

          {/* Split view */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left - Chat */}
            <div className="flex w-1/2 flex-col border-r border-border">
              <ChatContainer />
            </div>

            {/* Right - Preview */}
            <div className="flex w-1/2 flex-col">
              <PreviewPanel />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Project;
