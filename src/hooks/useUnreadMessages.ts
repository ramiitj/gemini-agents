import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useUnreadMessages = (projectId: string | null) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = useCallback(async () => {
    if (!projectId || !user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Get user's last read timestamp - use maybeSingle() to handle no existing record
    const { data: readStatus } = await supabase
      .from("chat_read_status")
      .select("last_read_at")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    const lastReadAt = readStatus?.last_read_at || new Date(0).toISOString();

    // Count messages after last read
    const { count } = await supabase
      .from("team_comments")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .gt("created_at", lastReadAt)
      .neq("user_id", user.id);

    setUnreadCount(count || 0);
    setLoading(false);
  }, [projectId, user]);

  // Subscribe to new messages
  useEffect(() => {
    if (!projectId) return;

    fetchUnreadCount();

    const channel = supabase
      .channel(`unread:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_comments",
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchUnreadCount]);

  const markAsRead = useCallback(async () => {
    if (!projectId || !user) return;

    await supabase
      .from("chat_read_status")
      .upsert({
        project_id: projectId,
        user_id: user.id,
        last_read_at: new Date().toISOString()
      }, {
        onConflict: "project_id,user_id"
      });

    setUnreadCount(0);
  }, [projectId, user]);

  return { unreadCount, loading, markAsRead, refetch: fetchUnreadCount };
};
