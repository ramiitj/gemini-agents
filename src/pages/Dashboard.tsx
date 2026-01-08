import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import AppSidebar from "@/components/layout/AppSidebar";
import ProjectCard from "@/components/layout/ProjectCard";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const mockProjects = [
  {
    id: "1",
    name: "marketing-site",
    repo: "acme/marketing-site",
    lastActivity: "2 hours ago",
  },
  {
    id: "2",
    name: "dashboard-app",
    repo: "acme/dashboard-app",
    lastActivity: "Yesterday",
  },
  {
    id: "3",
    name: "api-backend",
    repo: "acme/api-backend",
    lastActivity: "3 days ago",
  },
];

const Dashboard = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        
        <main className="flex-1">
          {/* Header */}
          <header className="flex h-14 items-center justify-between border-b border-border px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-sm font-medium text-foreground">Projects</h1>
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New project
            </Button>
          </header>

          {/* Project grid */}
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mockProjects.map((project) => (
                <Link key={project.id} to={`/project/${project.id}`}>
                  <ProjectCard
                    name={project.name}
                    repo={project.repo}
                    lastActivity={project.lastActivity}
                  />
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
