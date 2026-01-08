import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useProjects } from "@/hooks/useProjects";
import AppSidebar from "@/components/layout/AppSidebar";
import ProjectCard from "@/components/layout/ProjectCard";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import CreateProjectModal from "@/components/dashboard/CreateProjectModal";
import CreateOrganizationModal from "@/components/dashboard/CreateOrganizationModal";
import OrganizationSwitcher from "@/components/dashboard/OrganizationSwitcher";
import EmptyProjects from "@/components/dashboard/EmptyProjects";
import { formatDistanceToNow } from "date-fns";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { organizations, organization, loading: orgLoading, createOrganization } = useOrganization();
  const { projects, loading: projectsLoading, createProject } = useProjects();
  const navigate = useNavigate();

  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Show onboarding if no organizations
  const needsOnboarding = !orgLoading && organizations.length === 0;

  if (authLoading || orgLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1">
            <header className="flex h-14 items-center justify-between border-b border-border px-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-9 w-28" />
            </header>
            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28" />
                ))}
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />

        <main className="flex-1">
          {/* Header */}
          <header className="flex h-14 items-center justify-between border-b border-border px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              {organization ? (
                <OrganizationSwitcher onCreateNew={() => setCreateOrgOpen(true)} />
              ) : (
                <h1 className="text-sm font-medium text-foreground">Projects</h1>
              )}
            </div>
            {organization && (
              <Button size="sm" className="gap-2" onClick={() => setCreateProjectOpen(true)}>
                <Plus className="h-4 w-4" />
                New project
              </Button>
            )}
          </header>

          {/* Project grid */}
          <div className="p-6">
            {projectsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <EmptyProjects onCreateProject={() => setCreateProjectOpen(true)} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <Link key={project.id} to={`/project/${project.id}`}>
                    <ProjectCard
                      name={project.name}
                      repo={project.github_repo || undefined}
                      lastActivity={
                        project.created_at
                          ? formatDistanceToNow(new Date(project.created_at), {
                              addSuffix: true,
                            })
                          : "Unknown"
                      }
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <CreateProjectModal
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSubmit={createProject}
      />

      <CreateOrganizationModal
        open={needsOnboarding || createOrgOpen}
        onOpenChange={setCreateOrgOpen}
        onSubmit={createOrganization}
        isOnboarding={needsOnboarding}
      />
    </SidebarProvider>
  );
};

export default Dashboard;
