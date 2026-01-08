import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useToast } from "./use-toast";

export interface Project {
  id: string;
  name: string;
  github_repo: string | null;
  created_at: string | null;
  created_by: string | null;
}

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { organization } = useOrganization();
  const { toast } = useToast();

  const fetchProjects = async () => {
    if (!organization) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, github_repo, created_at, created_by")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [organization?.id]);

  const createProject = async (name: string, githubRepo?: string) => {
    if (!organization) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("projects")
        .insert({
          name,
          github_repo: githubRepo || null,
          organization_id: organization.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // If GitHub repo provided, automatically create Vercel project
      if (githubRepo) {
        try {
          toast({
            title: "Setting up deployment",
            description: "Creating Vercel project...",
          });

          const { data: vercelData, error: vercelError } = await supabase.functions.invoke('vercel-create-project', {
            body: { name, githubRepo, framework: 'vite' }
          });

          console.log('Vercel project creation response:', vercelData);

          if (vercelError) {
            console.error('Vercel project creation error:', vercelError);
            toast({
              title: "Warning",
              description: "Project created but Vercel setup failed. You can configure it later.",
              variant: "destructive",
            });
          } else if (vercelData?.projectId) {
            // Update project with Vercel project ID
            await supabase
              .from("projects")
              .update({ vercel_project_id: vercelData.projectId })
              .eq("id", data.id);

            data.vercel_project_id = vercelData.projectId;

            toast({
              title: "Success",
              description: "Project created with automatic deployment configured!",
            });
          }
        } catch (e) {
          console.error('Failed to create Vercel project:', e);
          toast({
            title: "Warning", 
            description: "Project created but Vercel setup failed. You can configure it later.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Project created successfully",
        });
      }

      setProjects((prev) => [data, ...prev]);
      return data;
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      return true;
    } catch (error: any) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    projects,
    loading,
    createProject,
    deleteProject,
    refetch: fetchProjects,
  };
};
