import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

import type { FileAttachment, SearchAttachment, AgentMode, GroundingMetadata, ImageSearchResult, DesignOutput } from "@/types/search";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  codeChanges?: {
    file: string;
    diff: string;
  }[];
  status?: "pending" | "complete" | "error";
  mode?: AgentMode;
  groundingMetadata?: GroundingMetadata;
  imageResults?: ImageSearchResult[];
  designOutput?: DesignOutput;
}

interface Conversation {
  id: string;
  title: string | null;
  project_id: string;
  created_at: string;
}

export function useConversation(projectId: string | undefined) {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  // Fetch or create conversation
  useEffect(() => {
    if (!projectId || !user) return;
    
    const fetchOrCreateConversation = async () => {
      setIsLoading(true);
      try {
        // Try to get existing conversation - use maybeSingle to avoid error on 0 rows
        const { data: existing, error: fetchError } = await supabase
          .from('conversations')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching conversation:', fetchError);
          throw fetchError;
        }

        if (existing) {
          setConversation(existing);
          await fetchMessages(existing.id);
        } else {
          // Create new conversation using auth context user
          const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert({
              project_id: projectId,
              created_by: user.id,
              title: 'New conversation'
            })
            .select()
            .single();

          if (createError) throw createError;
          setConversation(newConv);
          
          // Add system message
          const systemMessage: Message = {
            id: 'system-1',
            role: 'system',
            content: 'Connected to project. Ready to help!',
            timestamp: new Date()
          };
          setMessages([systemMessage]);
        }
      } catch (error: any) {
        console.error('Error with conversation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrCreateConversation();
  }, [projectId, user]);

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    const formattedMessages: Message[] = data.map(m => ({
      id: m.id,
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
      timestamp: new Date(m.created_at!),
      status: m.status as "pending" | "complete" | "error" | undefined,
      codeChanges: m.code_changes as any
    }));

    setMessages(formattedMessages);
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`messages-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as any;
            setMessages(prev => {
              // Avoid duplicates
              if (prev.find(m => m.id === newMsg.id)) return prev;
              return [...prev, {
                id: newMsg.id,
                role: newMsg.role,
                content: newMsg.content,
                timestamp: new Date(newMsg.created_at),
                status: newMsg.status,
                codeChanges: newMsg.code_changes
              }];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setMessages(prev => prev.map(m => 
              m.id === updated.id 
                ? { ...m, content: updated.content, status: updated.status }
                : m
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  const sendMessage = useCallback(async (
    content: string, 
    githubRepo?: string, 
    visualContext?: any,
    mode: AgentMode = "execution",
    attachments?: FileAttachment[],
    searchContext?: SearchAttachment[]
  ) => {
    if (!conversation?.id || !projectId || !user) return;

    setIsSending(true);
    
    // Add user message optimistically
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      
      // Save user message to database
      const { data: savedUserMsg, error: userMsgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          role: 'user',
          content,
          created_by: user?.id
        })
        .select()
        .single();

      if (userMsgError) throw userMsgError;

      // Update optimistic message with real ID
      setMessages(prev => prev.map(m => 
        m.id === userMessage.id ? { ...m, id: savedUserMsg.id } : m
      ));

      // Call AI agent with mode, visual context, attachments, and search context
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-agent', {
        body: {
          message: content,
          conversationId: conversation.id,
          projectId,
          githubRepo,
          visualContext,
          mode,
          userId: user?.id,
          attachments: attachments?.map(a => ({
            type: a.type,
            name: a.name,
            url: a.url,
            preview: a.preview,
            content: a.content
          })),
          searchContext: searchContext?.map(s => ({
            type: s.type,
            title: s.title,
            url: s.url,
            snippet: s.snippet,
            filePath: s.filePath
          })),
          history: messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (aiError) throw aiError;

      // Save AI response to database first to get real ID
      const { data: savedAiMsg, error: aiMsgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          role: 'assistant',
          content: aiResponse.response || 'I apologize, but I encountered an issue processing your request.',
          status: aiResponse.success ? 'complete' : 'error'
        })
        .select()
        .single();

      if (aiMsgError) throw aiMsgError;

      // Add AI response with the real database ID (realtime will skip due to duplicate check)
      const responseMessage: Message = {
        id: savedAiMsg.id,
        role: 'assistant',
        content: aiResponse.response || 'I apologize, but I encountered an issue processing your request.',
        timestamp: new Date(savedAiMsg.created_at),
        status: aiResponse.success ? 'complete' : 'error',
        mode: aiResponse.mode,
        groundingMetadata: aiResponse.groundingMetadata,
        imageResults: aiResponse.imageResults,
        designOutput: aiResponse.designOutput,
        codeChanges: aiResponse.codeChanges
      };

      setMessages(prev => [...prev, responseMessage]);

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to process request'}`,
        timestamp: new Date(),
        status: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  }, [conversation?.id, projectId, messages, toast, user]);

  return {
    conversation,
    messages,
    isLoading,
    isSending,
    sendMessage
  };
}
