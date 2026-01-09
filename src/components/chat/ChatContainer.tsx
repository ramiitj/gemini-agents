import { useEffect, useState } from "react";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import { useConversation } from "@/hooks/useConversation";
import { useAgentSession } from "@/hooks/useAgentSession";
import { useAgentActivity } from "@/hooks/useAgentActivity";
import { Skeleton } from "@/components/ui/skeleton";
import { GitBranch, FileCode } from "lucide-react";
import type { ElementInfo } from "@/lib/visual-edit-injector";

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
}

export interface VisualContext {
  element: ElementInfo;
  request: string;
}

export interface ScreenshotContext {
  url: string;
  imageData?: string;
}

interface ChatContainerProps {
  projectId: string;
  githubRepo?: string | null;
  visualContext?: VisualContext | null;
  onVisualContextHandled?: () => void;
  pendingScreenshot?: ScreenshotContext | null;
  onScreenshotHandled?: () => void;
}

const ChatContainer = ({ 
  projectId, 
  githubRepo, 
  visualContext, 
  onVisualContextHandled,
  pendingScreenshot,
  onScreenshotHandled
}: ChatContainerProps) => {
  const { messages, isLoading, isSending, sendMessage, conversation } = useConversation(projectId);
  const { session, loading: sessionLoading, updateMode } = useAgentSession(projectId);
  const { activities, clearActivities } = useAgentActivity(projectId, conversation?.id);
  const [localScreenshot, setLocalScreenshot] = useState<ScreenshotContext | null>(null);

  // Default to "execution" mode, only use session mode after it loads
  const mode = sessionLoading ? "execution" : (session?.agent_mode as "chat" | "execution") || "execution";

  // Sync external screenshot to local state
  useEffect(() => {
    if (pendingScreenshot) {
      setLocalScreenshot(pendingScreenshot);
      onScreenshotHandled?.();
    }
  }, [pendingScreenshot, onScreenshotHandled]);

  const handleSend = (content: string, screenshotContext?: ScreenshotContext, context?: VisualContext) => {
    if (sessionLoading) return; // Don't send until session loaded
    clearActivities(); // Clear old activities before sending new message
    
    // If screenshot context is provided, prepend it to the message
    let messageContent = content;
    if (screenshotContext?.url) {
      messageContent = `[Screenshot of ${screenshotContext.url}]\n\n${content}`;
    }
    
    sendMessage(messageContent, githubRepo || undefined, context?.element, mode);
    setLocalScreenshot(null);
  };

  const handleModeChange = (newMode: "chat" | "execution") => {
    updateMode(newMode);
  };

  const handleClearScreenshot = () => {
    setLocalScreenshot(null);
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
    <div className="flex h-full flex-col">
      {/* Session context indicator */}
      {session && (session.current_branch || session.github_repo) && (
        <div className="flex items-center gap-4 border-b border-border px-4 py-2 bg-muted/30">
          {session.github_repo && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <GitBranch className="h-3.5 w-3.5" />
              <span>{session.github_owner}/{session.github_repo}</span>
            </div>
          )}
          {session.current_branch && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-foreground font-medium">{session.current_branch}</span>
            </div>
          )}
          {session.staged_files && Object.keys(session.staged_files).length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileCode className="h-3.5 w-3.5" />
              <span>{Object.keys(session.staged_files).length} staged</span>
            </div>
          )}
        </div>
      )}
      
      <MessageList messages={messages} isTyping={isSending} activities={activities} />
      <ChatInput 
        onSend={(content, screenshot) => handleSend(content, screenshot)} 
        disabled={isSending}
        sessionLoading={sessionLoading}
        mode={mode}
        onModeChange={handleModeChange}
        pendingScreenshot={localScreenshot}
        onClearScreenshot={handleClearScreenshot}
      />
    </div>
  );
};

export default ChatContainer;
