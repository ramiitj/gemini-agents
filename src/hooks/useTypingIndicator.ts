import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface TypingUser {
  id: string;
  name: string;
}

export const useTypingIndicator = (projectId: string | null) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

  // Fetch profiles for typing users
  const fetchTypingUsers = useCallback(async () => {
    if (!projectId) return;

    const { data } = await supabase
      .from("chat_typing")
      .select("user_id")
      .eq("project_id", projectId)
      .gt("updated_at", new Date(Date.now() - 5000).toISOString());

    if (data && data.length > 0) {
      const userIds = data.map(t => t.user_id).filter(id => id !== user?.id);
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        setTypingUsers(
          (profiles || []).map(p => ({
            id: p.id,
            name: p.full_name || "Someone"
          }))
        );
      } else {
        setTypingUsers([]);
      }
    } else {
      setTypingUsers([]);
    }
  }, [projectId, user?.id]);

  // Subscribe to realtime typing changes
  useEffect(() => {
    if (!projectId) return;

    fetchTypingUsers();

    const channel = supabase
      .channel(`typing:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_typing",
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchTypingUsers();
        }
      )
      .subscribe();

    // Poll every 3 seconds to clean up stale typing indicators
    const pollInterval = setInterval(fetchTypingUsers, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [projectId, fetchTypingUsers]);

  // Set typing status
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!projectId || !user) return;

    const now = Date.now();
    
    // Debounce - only update if 1 second has passed
    if (isTyping && now - lastTypingRef.current < 1000) return;
    lastTypingRef.current = now;

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      // Upsert typing status
      await supabase
        .from("chat_typing")
        .upsert({
          project_id: projectId,
          user_id: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: "project_id,user_id"
        });

      // Auto-clear after 3 seconds of no typing
      typingTimeoutRef.current = setTimeout(async () => {
        await supabase
          .from("chat_typing")
          .delete()
          .eq("project_id", projectId)
          .eq("user_id", user.id);
      }, 3000);
    } else {
      // Clear typing status immediately
      await supabase
        .from("chat_typing")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", user.id);
    }
  }, [projectId, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { typingUsers, setTyping };
};
