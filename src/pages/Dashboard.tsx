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
import WelcomeTour, { dashboardTourSteps } from "@/components/onboarding/WelcomeTour";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { formatDistanceToNow } from "date-fns";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { 
    organizations, 
    organization, 
    loading: orgLoading, 
    hasInitialized, 
    createOrganization,
    justJoinedViaInvite,
    clearJustJoinedFlag
  } = useOrganization();
  const { projects, loading: projectsLoading, createProject } = useProjects();
  const navigate = useNavigate();
  const { showDashboardTour, startDashboardTour, completeDashboardTour, hasSeenDashboardTour } = useOnboardingTour();

  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [justCreatedOrg, setJustCreatedOrg] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Trigger dashboard tour after org creation - MUST be before early returns
  useEffect(() => {
    if (justCreatedOrg && !hasSeenDashboardTour && organization) {
      // Small delay to ensure modal is closed
      const timer = setTimeout(() => {
        startDashboardTour();
        setJustCreatedOrg(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [justCreatedOrg, hasSeenDashboardTour, organization, startDashboardTour]);

  // Auto-redirect to specific invited project
  useEffect(() => {
    const invitedProjectId = localStorage.getItem('invited_project_id');
    if (invitedProjectId && hasInitialized && !projectsLoading) {
      localStorage.removeItem('invited_project_id');
      navigate(`/project/${invitedProjectId}`);
    }
  }, [hasInitialized, projectsLoading, navigate]);

  // Auto-navigate invited users to their project if exactly one exists
  useEffect(() => {
    if (justJoinedViaInvite && !projectsLoading && organization && projects.length === 1) {
      clearJustJoinedFlag();
      navigate(`/project/${projects[0].id}`);
    } else if (justJoinedViaInvite && !projectsLoading && organization && projects.length !== 1) {
      // Clear flag if multiple or no projects - user stays on dashboard
      clearJustJoinedFlag();
    }
  }, [justJoinedViaInvite, projectsLoading, organization, projects, navigate, clearJustJoinedFlag]);

  // Auto-open create project modal after org creation
  useEffect(() => {
    if (justCreatedOrg && organization && !projectsLoading && projects.length === 0 && !showDashboardTour) {
      setCreateProjectOpen(true);
    }
  }, [justCreatedOrg, organization, projectsLoading, projects.length, showDashboardTour]);

  // Show onboarding only after we've confirmed there are no orgs AND not loading AND not just joined via invite
  const needsOnboarding = hasInitialized && !orgLoading && organizations.length === 0 && !justJoinedViaInvite;

  // Wait for auth, org initialization, and org loading to complete
  if (authLoading || !hasInitialized || orgLoading) {
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

  const handleOrgCreated = async (name: string) => {
    const result = await createOrganization(name);
    if (result) {
      setJustCreatedOrg(true);
    }
    return result;
  };

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
                <div data-tour="org-switcher">
                  <OrganizationSwitcher onCreateNew={() => setCreateOrgOpen(true)} />
                </div>
              ) : (
                <h1 className="text-sm font-medium text-foreground">Projects</h1>
              )}
            </div>
            {organization && (
              <Button 
                size="sm" 
                className="gap-2" 
                onClick={() => setCreateProjectOpen(true)}
                data-tour="new-project"
              >
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-tour="project-grid">
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

      {/* Welcome Tour */}
      <WelcomeTour
        run={showDashboardTour}
        steps={dashboardTourSteps}
        onComplete={completeDashboardTour}
      />

      {/* Modals */}
      <CreateProjectModal
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSubmit={createProject}
      />

      <CreateOrganizationModal
        open={needsOnboarding || createOrgOpen}
        onOpenChange={setCreateOrgOpen}
        onSubmit={handleOrgCreated}
        isOnboarding={needsOnboarding}
      />
    </SidebarProvider>
  );
};

export default Dashboard;
