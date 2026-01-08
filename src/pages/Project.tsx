import { useParams, Navigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppSidebar from "@/components/layout/AppSidebar";
import ChatContainer, { VisualContext } from "@/components/chat/ChatContainer";
import PreviewPanel from "@/components/preview/PreviewPanel";
import TeamSidebar from "@/components/team/TeamSidebar";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useOrganization } from "@/hooks/useOrganization";
import { Skeleton } from "@/components/ui/skeleton";
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
  const { organization } = useOrganization();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [visualContext, setVisualContext] = useState<VisualContext | null>(null);

  useEffect(() => {
    if (!id) return;

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
  }, [id]);

  const handleSendToAI = useCallback((element: ElementInfo, request: string) => {
    setVisualContext({ element, request });
  }, []);

  const handleVisualContextHandled = useCallback(() => {
    setVisualContext(null);
  }, []);

  const handleVercelSetup = useCallback((newVercelProjectId: string) => {
    setProject(prev => prev ? { ...prev, vercel_project_id: newVercelProjectId } : null);
  }, []);

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex flex-1 flex-col">
            <header className="flex h-14 items-center border-b border-border px-4">
              <Skeleton className="h-6 w-32" />
            </header>
            <div className="flex flex-1 p-4">
              <Skeleton className="h-full w-full" />
            </div>
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
      <div className="flex min-h-screen w-full">
        <AppSidebar />

        <main className="flex flex-1 flex-col">
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

          <div className="flex flex-1 overflow-hidden">
            <div className="flex w-1/2 flex-col border-r border-border">
              <ChatContainer 
                projectId={project.id} 
                githubRepo={project.github_repo}
                visualContext={visualContext}
                onVisualContextHandled={handleVisualContextHandled}
              />
            </div>
            <div className="flex w-1/2 flex-col">
              <PreviewPanel 
                projectId={project.id}
                vercelProjectId={project.vercel_project_id}
                githubRepo={project.github_repo}
                onSendToAI={handleSendToAI}
                onVercelSetup={handleVercelSetup}
              />
            </div>
            <TeamSidebar organizationId={organization?.id || null} />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Project;
