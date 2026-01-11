import { useEffect, useState } from "react";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import { useConversation } from "@/hooks/useConversation";
import { useAgentSession } from "@/hooks/useAgentSession";
import { useAgentActivity } from "@/hooks/useAgentActivity";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GitBranch, FileCode, Pin, X } from "lucide-react";
import type { ElementInfo } from "@/lib/visual-edit-injector";
import type { FileAttachment, SearchAttachment, AgentMode, GroundingMetadata, ImageSearchResult, DesignOutput } from "@/types/search";

export interface Message {
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

export interface VisualContext {
  element: ElementInfo;
  request: string;
}

interface ChatContainerProps {
  projectId: string;
  githubRepo?: string | null;
  previewUrl?: string | null;
  visualContext?: VisualContext | null;
  onVisualContextHandled?: () => void;
  searchContext?: SearchAttachment[];
}

const ChatContainer = ({ 
  projectId, 
  githubRepo, 
  previewUrl,
  visualContext, 
  onVisualContextHandled,
  searchContext
}: ChatContainerProps) => {
  const { messages, isLoading, isSending, sendMessage, conversation } = useConversation(projectId);
  const { session, loading: sessionLoading, updateMode } = useAgentSession(projectId);
  const { activities, clearActivities } = useAgentActivity(projectId, conversation?.id);
  
  // Track the mode being used for the current pending request
  const [pendingMode, setPendingMode] = useState<AgentMode | null>(null);
  
  // Persist pinned results in sessionStorage
  const [pinnedResults, setPinnedResults] = useState<SearchAttachment[]>(() => {
    try {
      const saved = sessionStorage.getItem(`pinned-${projectId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save pinned results when they change
  useEffect(() => {
    try {
      sessionStorage.setItem(`pinned-${projectId}`, JSON.stringify(pinnedResults));
    } catch {
      // Ignore storage errors
    }
  }, [pinnedResults, projectId]);

  // Clear pending mode when sending completes
  useEffect(() => {
    if (!isSending) {
      setPendingMode(null);
    }
  }, [isSending]);

  // Default to "execution" mode, only use session mode after it loads
  const mode: AgentMode = sessionLoading ? "execution" : (session?.agent_mode as AgentMode) || "execution";
  
  // Use pendingMode while actively sending, otherwise use session mode
  const displayMode: AgentMode = pendingMode ?? mode;

  const handlePinResult = (result: SearchAttachment) => {
    setPinnedResults(prev => {
      const exists = prev.some(p => p.url === result.url);
      if (exists) {
        return prev.filter(p => p.url !== result.url);
      }
      return [...prev, result];
    });
  };

  const unpinResult = (index: number) => {
    setPinnedResults(prev => prev.filter((_, i) => i !== index));
  };

  const pinnedUrls = pinnedResults.map(r => r.url).filter(Boolean) as string[];

  const handleSend = (content: string, attachments?: FileAttachment[], context?: VisualContext, overrideMode?: AgentMode) => {
    if (sessionLoading) return;
    clearActivities();
    
    // Use overrideMode if provided (for mode-specific actions), otherwise use current mode
    const modeToUse = overrideMode ?? mode;
    
    // Track the mode being used for this request (for correct loading labels)
    setPendingMode(modeToUse);
    
    // Combine searchContext with pinned results
    const combinedSearchContext = [...(searchContext || []), ...pinnedResults];
    
    // Pass raw attachments and search context to sendMessage - backend handles formatting
    sendMessage(
      content, 
      githubRepo || undefined, 
      context?.element, 
      modeToUse,
      attachments,
      combinedSearchContext.length > 0 ? combinedSearchContext : undefined
    );
  };

  const handleModeChange = (newMode: AgentMode) => {
    updateMode(newMode);
  };

  // Auto-send when visual context is provided
  useEffect(() => {
    if (visualContext && !isSending) {
      handleSend(visualContext.request, undefined, visualContext);
      onVisualContextHandled?.();
    }
  }, [visualContext]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col p-4 space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-12 w-1/2 ml-auto" />
        <Skeleton className="h-12 w-3/4" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* Header - unified h-12 */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4 bg-muted/30">
        <span className="text-sm font-medium">Agent</span>
        <div className="flex items-center gap-3">
          {session?.github_repo && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <GitBranch className="h-3.5 w-3.5" />
              <span>{session.github_owner}/{session.github_repo}</span>
            </div>
          )}
          {session?.current_branch && (
            <span className="text-xs font-medium text-foreground">{session.current_branch}</span>
          )}
          {session?.staged_files && Object.keys(session.staged_files).length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileCode className="h-3.5 w-3.5" />
              <span>{Object.keys(session.staged_files).length} staged</span>
            </div>
          )}
        </div>
      </div>
      
      <MessageList 
        messages={messages} 
        isTyping={isSending} 
        activities={activities}
        onPinResult={handlePinResult}
        pinnedUrls={pinnedUrls}
        currentMode={displayMode}
      />

      {/* Pinned results bar */}
      {pinnedResults.length > 0 && (
        <div className="border-t border-border px-4 py-2 bg-accent/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Pin className="h-3 w-3" />
            Pinned sources ({pinnedResults.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {pinnedResults.map((r, i) => (
              <Badge key={i} variant="secondary" className="flex items-center gap-1 pr-1">
                <span className="max-w-32 truncate">{r.title}</span>
                <button 
                  onClick={() => unpinResult(i)}
                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <ChatInput 
        onSend={(content, attachments) => handleSend(content, attachments)} 
        previewUrl={previewUrl}
        disabled={isSending}
        sessionLoading={sessionLoading}
        mode={mode}
        onModeChange={handleModeChange}
      />
    </div>
  );
};

export default ChatContainer;
