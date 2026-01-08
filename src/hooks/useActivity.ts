import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityItem {
  id: string;
  action: string;
  metadata: Record<string, any> | null;
  created_at: string;
  user_id: string | null;
  project_id: string | null;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useActivity = (organizationId: string | null, projectId?: string | null) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    if (!organizationId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("activity_log")
      .select(`
        id,
        action,
        metadata,
        created_at,
        user_id,
        project_id,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching activities:", error);
      setLoading(false);
      return;
    }

    const formattedActivities: ActivityItem[] = (data || []).map((item: any) => ({
      id: item.id,
      action: item.action,
      metadata: item.metadata,
      created_at: item.created_at,
      user_id: item.user_id,
      project_id: item.project_id,
      profile: item.profiles,
    }));

    setActivities(formattedActivities);
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();

    // Subscribe to realtime updates
    if (organizationId) {
      const channel = supabase
        .channel("activity-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "activity_log",
            filter: `organization_id=eq.${organizationId}`,
          },
          () => {
            fetchActivities();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [organizationId, projectId]);

  const logActivity = async (
    action: string,
    metadata?: Record<string, any>,
    projectId?: string
  ) => {
    if (!organizationId) return;

    const { error } = await supabase.from("activity_log").insert({
      organization_id: organizationId,
      project_id: projectId || null,
      action,
      metadata: metadata || null,
    });

    if (error) {
      console.error("Error logging activity:", error);
    }
  };

  return {
    activities,
    loading,
    logActivity,
    refetch: fetchActivities,
  };
};
