import { useEffect, useState } from "react";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import { useConversation } from "@/hooks/useConversation";
import { useAgentSession } from "@/hooks/useAgentSession";
import { useAgentActivity } from "@/hooks/useAgentActivity";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GitBranch, FileCode, Layers, X, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

interface DesignContext {
  imageUrl: string;
  prompt: string;
  code?: string;
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
  
  // Context panel state
  const [contextOpen, setContextOpen] = useState(true);
  const [designContext, setDesignContext] = useState<DesignContext | null>(null);
  
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

  const clearDesignContext = () => {
    setDesignContext(null);
  };

  // Handle using design as context
  const handleUseDesignAsContext = (design: DesignOutput, type: 'image' | 'code') => {
    if (type === 'image') {
      setDesignContext({
        imageUrl: design.imageUrl,
        prompt: design.prompt,
        code: design.code
      });
    } else {
      // Switch to execute mode with code in context
      handleModeChange('execution');
      setDesignContext({
        imageUrl: design.imageUrl,
        prompt: design.prompt,
        code: design.code
      });
    }
  };

  const pinnedUrls = pinnedResults.map(r => r.url).filter(Boolean) as string[];
  const hasContext = pinnedResults.length > 0 || designContext !== null;
  const contextCount = pinnedResults.length + (designContext ? 1 : 0);

  const handleSend = (content: string, attachments?: FileAttachment[], context?: VisualContext, overrideMode?: AgentMode) => {
    if (sessionLoading) return;
    clearActivities();
    
    // Use overrideMode if provided (for mode-specific actions), otherwise use current mode
    const modeToUse = overrideMode ?? mode;
    
    // Track the mode being used for this request (for correct loading labels)
    setPendingMode(modeToUse);
    
    // Combine searchContext with pinned results
    const combinedSearchContext = [...(searchContext || []), ...pinnedResults];
    
    // If design context code exists and in execute mode, append it
    let messageContent = content;
    if (designContext?.code && modeToUse === 'execution') {
      messageContent = `${content}\n\nUse this design code as reference:\n\`\`\`tsx\n${designContext.code}\n\`\`\``;
    }
    
    // Pass raw attachments and search context to sendMessage - backend handles formatting
    sendMessage(
      messageContent, 
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
        onUseDesignContext={handleUseDesignAsContext}
      />

      {/* Context Window - collapsible, more prominent */}
      {hasContext && (
        <div className="border-t border-border bg-accent/30">
          <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span>Context ({contextCount})</span>
              </div>
              {contextOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-3">
              <div className="grid grid-cols-2 gap-2">
                {/* Design context with preview */}
                {designContext && (
                  <div className="relative rounded-md border border-border p-2 bg-background">
                    <img 
                      src={designContext.imageUrl} 
                      alt="Design context"
                      className="h-16 w-full object-cover rounded" 
                    />
                    <span className="text-xs text-muted-foreground mt-1 block truncate">
                      Design: {designContext.prompt}
                    </span>
                    <button 
                      onClick={clearDesignContext}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 hover:bg-muted"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                
                {/* Pinned search results */}
                {pinnedResults.map((r, i) => (
                  <div key={i} className="relative flex items-center gap-2 rounded-md border border-border p-2 bg-background">
                    <span className="text-xs truncate flex-1">{r.title}</span>
                    <button 
                      onClick={() => unpinResult(i)}
                      className="p-0.5 rounded-full hover:bg-muted"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
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
