import { useParams, Navigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppSidebar from "@/components/layout/AppSidebar";
import ChatContainer, { VisualContext } from "@/components/chat/ChatContainer";
import PreviewPanel from "@/components/preview/PreviewPanel";
import TeamSidebar from "@/components/team/TeamSidebar";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useOrganization } from "@/hooks/useOrganization";
import { Skeleton } from "@/components/ui/skeleton";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import WelcomeTour, { projectTourSteps } from "@/components/onboarding/WelcomeTour";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import type { ElementInfo } from "@/lib/visual-edit-injector";

interface ProjectData {
  id: string;
  name: string;
  github_repo: string | null;
  vercel_project_id: string | null;
}

function parseGitHubUrl(url: string) {
  const match = url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
  if (match) {
    return { owner: match[1], repo: match[2], branch: "main" };
  }
  return null;
}

const Project = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { organization } = useOrganization();
  const { showProjectTour, startProjectTour, completeProjectTour, hasSeenProjectTour } = useOnboardingTour();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [visualContext, setVisualContext] = useState<VisualContext | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user) return;

    const fetchProject = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, github_repo, vercel_project_id")
        .eq("id", id)
        .single();

      if (!error && data) {
        setProject(data);
      }
      setLoading(false);
    };

    fetchProject();
  }, [id, user]);

  // Trigger project tour on first visit
  useEffect(() => {
    if (project && !hasSeenProjectTour && !loading) {
      const timer = setTimeout(() => {
        startProjectTour();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [project, hasSeenProjectTour, loading, startProjectTour]);

  const handleSendToAI = useCallback((element: ElementInfo, request: string) => {
    setVisualContext({ element, request });
  }, []);

  const handleVisualContextHandled = useCallback(() => {
    setVisualContext(null);
  }, []);

  const handleVercelSetup = useCallback((newVercelProjectId: string) => {
    setProject(prev => prev ? { ...prev, vercel_project_id: newVercelProjectId } : null);
  }, []);

  const handlePreviewUrlChange = useCallback((url: string | null) => {
    setPreviewUrl(url);
  }, []);

  // Redirect if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/auth" />;
  }

  if (authLoading || loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex flex-1 flex-col">
            <header className="flex h-14 items-center border-b border-border px-4">
              <Skeleton className="h-6 w-32" />
            </header>
            <ResizablePanelGroup direction="horizontal" className="flex-1">
              <ResizablePanel defaultSize={30}>
                <Skeleton className="h-full w-full" />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={45}>
                <Skeleton className="h-full w-full" />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={25}>
                <Skeleton className="h-full w-full" />
              </ResizablePanel>
            </ResizablePanelGroup>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!project) {
    return <Navigate to="/dashboard" />;
  }

  const repoInfo = project.github_repo ? parseGitHubUrl(project.github_repo) : null;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />

        <main className="flex flex-1 flex-col h-full overflow-hidden">
          <header className="flex h-14 items-center justify-between border-b border-border px-4">
            <div className="flex items-center">
              <SidebarTrigger />
              <span className="ml-3 text-sm font-medium text-foreground">
                {project.name}
              </span>
              {repoInfo && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {repoInfo.branch}
                </span>
              )}
            </div>
            <NotificationDropdown />
          </header>

          <ResizablePanelGroup 
            direction="horizontal" 
            className="flex-1 min-h-0 overflow-hidden"
            autoSaveId="project-workspace"
          >
            {/* Agent Panel */}
            <ResizablePanel 
              defaultSize={30} 
              minSize={20} 
              maxSize={50}
              className="flex flex-col"
            >
              <div className="h-full" data-tour="chat-panel">
                <ChatContainer 
                  projectId={project.id} 
                  githubRepo={project.github_repo}
                  previewUrl={previewUrl}
                  visualContext={visualContext}
                  onVisualContextHandled={handleVisualContextHandled}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="hover:bg-primary/10 transition-colors" />

            {/* Preview Panel */}
            <ResizablePanel 
              defaultSize={45} 
              minSize={25}
              className="flex flex-col"
            >
              <div className="h-full" data-tour="preview-panel">
                <PreviewPanel 
                  projectId={project.id}
                  vercelProjectId={project.vercel_project_id}
                  githubRepo={project.github_repo}
                  onSendToAI={handleSendToAI}
                  onVercelSetup={handleVercelSetup}
                  onPreviewUrlChange={handlePreviewUrlChange}
                />
              </div>
            </ResizablePanel>

            {/* Preview Panel */}
            <ResizablePanel 
              defaultSize={45} 
              minSize={25}
              className="flex flex-col"
            >
              <PreviewPanel 
                projectId={project.id}
                vercelProjectId={project.vercel_project_id}
                githubRepo={project.github_repo}
                onSendToAI={handleSendToAI}
                onVercelSetup={handleVercelSetup}
                onPreviewUrlChange={handlePreviewUrlChange}
              />
            </ResizablePanel>

            <ResizableHandle withHandle className="hover:bg-primary/10 transition-colors" />

            {/* Team Panel */}
            <ResizablePanel 
              defaultSize={25} 
              minSize={15} 
              maxSize={35}
              collapsible
              collapsedSize={4}
              className="flex flex-col"
            >
              <div className="h-full" data-tour="team-panel">
                <TeamSidebar organizationId={organization?.id || null} projectId={project.id} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>
      </div>

      {/* Welcome Tour */}
      <WelcomeTour
        run={showProjectTour}
        steps={projectTourSteps}
        onComplete={completeProjectTour}
      />
    </SidebarProvider>
  );
};

export default Project;
